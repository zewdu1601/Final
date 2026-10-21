from io import BytesIO

from django.core.files.storage import default_storage
from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse
from PIL import Image
from passlib.context import CryptContext
from rest_framework.test import APIClient

from .models import StoreUser
from .views import create_access_token

password_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class UserManagementAPITests(TransactionTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(StoreUser)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            schema_editor.delete_model(StoreUser)
        super().tearDownClass()

    def setUp(self):
        StoreUser.objects.all().delete()
        self.admin = self.make_user('admin@example.test', 'admin-user', 'admin', True)
        self.customer = self.make_user('customer@example.test', 'customer-user')
        self.client = APIClient()
        self.uploaded_files = []

    def tearDown(self):
        StoreUser.objects.all().delete()
        for name in self.uploaded_files:
            default_storage.delete(name)

    @staticmethod
    def make_user(email, username, role='customer', is_admin=False):
        return StoreUser.objects.create(
            email=email,
            username=username,
            full_name=username.replace('-', ' ').title(),
            role=role,
            is_admin=is_admin,
            is_active=True,
            hashed_password=password_context.hash('StrongPass123'),
        )

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {create_access_token(user)}')

    def test_admin_can_search_filter_and_view_user_records_and_stats(self):
        self.authenticate(self.admin)
        response = self.client.get('/api/admin/users', {
            'search': 'customer-user',
            'role': 'customer',
            'active': 'true',
            'page': 1,
            'page_size': 10,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['items'][0]['id'], self.customer.id)
        self.assertNotIn('hashed_password', response.data['items'][0])
        self.assertEqual(response.data['stats'], {
            'total_users': 2,
            'admins': 1,
            'store_managers': 0,
            'customers': 1,
        })

        details = self.client.get(f'/api/admin/users/{self.customer.id}')
        self.assertEqual(details.status_code, 200)
        self.assertEqual(details.data['email'], self.customer.email)

    def test_user_management_requires_an_admin(self):
        self.authenticate(self.customer)
        self.assertEqual(self.client.get('/api/admin/users').status_code, 403)
        self.client.credentials()
        self.assertEqual(self.client.get('/api/admin/users').status_code, 401)

    def test_admin_can_create_update_activate_and_delete_users(self):
        self.authenticate(self.admin)
        created = self.client.post('/api/admin/users', {
            'email': 'new@example.test',
            'username': 'new-user',
            'full_name': 'New User',
            'password': 'InitialPass123',
            'role': 'manager',
        }, format='json')
        self.assertEqual(created.status_code, 201)
        new_user_id = created.data['id']
        new_user = StoreUser.objects.get(pk=new_user_id)
        self.assertTrue(password_context.verify('InitialPass123', new_user.hashed_password))
        self.assertNotIn('password', created.data)

        updated = self.client.patch(f'/api/admin/users/{new_user_id}', {
            'role': 'customer',
            'full_name': 'Updated User',
        }, format='json')
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['role'], 'customer')
        self.assertFalse(updated.data['is_admin'])

        activated = self.client.patch(f'/api/admin/users/{new_user_id}/active', {
            'is_active': False,
        }, format='json')
        self.assertEqual(activated.status_code, 200)
        self.assertFalse(activated.data['is_active'])

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {create_access_token(new_user)}')
        self.assertEqual(self.client.get('/api/auth/me').status_code, 401)
        self.authenticate(self.admin)
        deleted = self.client.delete(f'/api/admin/users/{new_user_id}')
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(StoreUser.objects.filter(pk=new_user_id).exists())

    def test_last_active_admin_cannot_be_demoted_deactivated_or_deleted(self):
        self.authenticate(self.admin)
        demoted = self.client.patch(f'/api/admin/users/{self.admin.id}', {
            'role': 'customer',
        }, format='json')
        self.assertEqual(demoted.status_code, 400)

        deactivated = self.client.patch(f'/api/admin/users/{self.admin.id}', {
            'is_active': False,
        }, format='json')
        self.assertEqual(deactivated.status_code, 400)
        self.assertEqual(self.client.delete(f'/api/admin/users/{self.admin.id}').status_code, 400)

    def test_admin_can_upload_valid_profile_photo(self):
        self.authenticate(self.admin)
        image_file = BytesIO()
        Image.new('RGB', (12, 12), color='purple').save(image_file, format='PNG')
        image_file.seek(0)
        from django.core.files.uploadedfile import SimpleUploadedFile

        response = self.client.post('/api/admin/users/{}/photo'.format(self.customer.id), {
            'photo': SimpleUploadedFile('profile.png', image_file.read(), content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['photo_url'].startswith('/media/user-photos/'))
        self.uploaded_files.append(response.data['photo_url'].removeprefix('/media/'))

    def test_user_can_change_own_password_and_old_token_is_revoked(self):
        self.authenticate(self.customer)
        response = self.client.post('/api/auth/change-password', {
            'current_password': 'StrongPass123',
            'new_password': 'NewSecurePass456',
            'confirm_password': 'NewSecurePass456',
        }, format='json')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(password_context.verify('StrongPass123', StoreUser.objects.get(pk=self.customer.id).hashed_password))
        self.assertEqual(self.client.get('/api/auth/me').status_code, 401)

        login = self.client.post('/api/auth/login', {
            'email': self.customer.email,
            'password': 'NewSecurePass456',
        }, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['user']['id'], self.customer.id)
