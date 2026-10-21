from datetime import datetime, timedelta, timezone
from io import BytesIO
import warnings
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.paginator import EmptyPage, Paginator
from django.db import IntegrityError, connection, transaction
from django.db.models import Count, Q
from jose import JWTError, jwt
from PIL import Image, ImageOps, UnidentifiedImageError
from passlib.context import CryptContext
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import StoreJWTAuthentication
from .models import StoreUser
from .permissions import IsStoreAdmin
from .serializers import (
    AdminProfileUpdateSerializer,
    AdminCreateUserSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    RegisterUserSerializer,
    StoreUserSerializer,
)

password_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
ALLOWED_ROLES = {'admin', 'manager', 'customer'}
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}


def create_access_token(user):
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(
        {'exp': expires, 'sub': str(user.id), 'ver': user.token_version},
        settings.SECRET_KEY,
        algorithm='HS256',
    )


def save_profile_photo(request, user):
    photo = request.FILES.get('photo')
    if not photo:
        raise ValidationError({'photo': 'Choose a profile photo to upload.'})
    if photo.size > MAX_PHOTO_BYTES:
        raise ValidationError({'photo': 'Profile photos must be 5 MB or smaller.'})
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            image = Image.open(photo)
            photo_format = image.format
            image.verify()
            photo.seek(0)
            image = Image.open(photo)
            image.load()
            image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise ValidationError({'photo': 'Upload a valid JPG, PNG, or WebP image.'}) from error

    if photo_format not in PHOTO_FORMATS:
        raise ValidationError({'photo': 'Upload a valid JPG, PNG, or WebP image.'})
    extension = PHOTO_FORMATS[photo_format]
    if photo_format == 'JPEG':
        image = image.convert('RGB')
    output = BytesIO()
    image.save(output, format=photo_format, optimize=True)
    stored_name = default_storage.save(
        f'user-photos/{uuid4().hex}.{extension}',
        ContentFile(output.getvalue()),
    )
    previous_path = user.photo_url.removeprefix(settings.MEDIA_URL) if user.photo_url and user.photo_url.startswith(settings.MEDIA_URL) else None
    user.photo_url = f'{settings.MEDIA_URL}{stored_name}'
    user.save(update_fields=['photo_url'])
    if previous_path:
        transaction.on_commit(lambda: default_storage.delete(previous_path))
    return user


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credentials = serializer.validated_data
        users = StoreUser.objects.all()
        user = users.filter(email__iexact=credentials['email'].strip()).first() if credentials.get('email') else users.filter(username__iexact=credentials['username'].strip()).first()
        if not user or not password_context.verify(credentials['password'], user.hashed_password):
            return Response({'detail': 'Incorrect email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({'detail': 'Inactive account.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'access_token': create_access_token(user),
            'token_type': 'bearer',
            'user': StoreUserSerializer(user).data,
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data.copy()
        serializer = RegisterUserSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(StoreUserSerializer(user).data, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [StoreJWTAuthentication]

    def get(self, request):
        return Response(StoreUserSerializer(request.user).data)

    def post(self, request):
        request.user.token_version += 1
        request.user.save(update_fields=['token_version'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [StoreJWTAuthentication]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        values = serializer.validated_data
        if not password_context.verify(values['current_password'], user.hashed_password):
            raise ValidationError({'current_password': 'Current password is incorrect.'})
        user.hashed_password = password_context.hash(values['new_password'])
        user.token_version += 1
        user.save(update_fields=['hashed_password', 'token_version'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProfileView(APIView):
    permission_classes = [IsStoreAdmin]

    def get(self, request):
        return Response(StoreUserSerializer(request.user).data)

    @transaction.atomic
    def patch(self, request):
        serializer = AdminProfileUpdateSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError as error:
            raise ValidationError({'detail': 'Email or username is already in use.'}) from error
        return Response(StoreUserSerializer(user).data)


class AdminUserListView(APIView):
    permission_classes = [IsStoreAdmin]

    def get(self, request):
        users = StoreUser.objects.all()
        search = request.query_params.get('search', '').strip()
        role = request.query_params.get('role', '').strip()
        active = request.query_params.get('active', request.query_params.get('is_active'))
        page_number = self._parse_integer(request.query_params.get('page', '1'), 'page')
        page_size = self._parse_integer(request.query_params.get('page_size', '10'), 'page_size')

        if page_number < 1:
            raise ValidationError({'page': 'Page must be at least 1.'})
        if page_size < 1 or page_size > 100:
            raise ValidationError({'page_size': 'Page size must be between 1 and 100.'})
        if role and role not in ALLOWED_ROLES:
            raise ValidationError({'role': 'Choose admin, manager, or customer.'})
        if active not in (None, '', 'true', 'false', '1', '0'):
            raise ValidationError({'active': 'Choose true or false.'})

        if search:
            users = users.filter(
                Q(full_name__icontains=search)
                | Q(username__icontains=search)
                | Q(email__icontains=search)
            )
        if role == 'admin':
            users = users.filter(Q(role='admin') | Q(is_admin=True))
        elif role:
            users = users.filter(role=role)
        if active not in (None, ''):
            users = users.filter(is_active=active.lower() in ('true', '1'))

        paginator = Paginator(users.order_by('-created_at', '-id'), page_size)
        try:
            page = paginator.page(page_number)
        except EmptyPage:
            page = paginator.page(paginator.num_pages or 1)

        aggregates = StoreUser.objects.aggregate(
            total_users=Count('id'),
            admins=Count('id', filter=Q(role='admin') | Q(is_admin=True)),
            store_managers=Count('id', filter=Q(role='manager')),
            customers=Count('id', filter=Q(role='customer') & Q(is_admin=False)),
        )
        return Response({
            'items': StoreUserSerializer(page.object_list, many=True).data,
            'total': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'stats': aggregates,
        })

    @staticmethod
    def _parse_integer(value, field):
        try:
            return int(value)
        except (TypeError, ValueError) as error:
            raise ValidationError({field: 'Enter a whole number.'}) from error

    @transaction.atomic
    def post(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError as error:
            raise ValidationError({'detail': 'Email or username is already in use.'}) from error
        return Response(StoreUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsStoreAdmin]

    @staticmethod
    def get_user(user_id, lock=False):
        query = StoreUser.objects.select_for_update() if lock else StoreUser.objects
        try:
            return query.get(pk=user_id)
        except StoreUser.DoesNotExist as error:
            raise NotFound('User not found.') from error

    def get(self, request, user_id):
        return Response(StoreUserSerializer(self.get_user(user_id)).data)

    @transaction.atomic
    def patch(self, request, user_id):
        user = self.get_user(user_id, lock=True)
        serializer = StoreUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        next_role = values.get('role', user.role)
        next_active = values.get('is_active', user.is_active)
        if user.pk == request.user.pk and not next_active:
            raise ValidationError({'detail': 'You cannot deactivate your own account.'})
        self._protect_last_admin(user, next_role, next_active)
        if next_active != user.is_active:
            values['token_version'] = user.token_version + 1
        try:
            updated = serializer.save(is_admin=next_role == 'admin')
        except IntegrityError as error:
            raise ValidationError({'detail': 'Email or username is already in use.'}) from error
        return Response(StoreUserSerializer(updated).data)

    @transaction.atomic
    def delete(self, request, user_id):
        user = self.get_user(user_id, lock=True)
        if user.pk == request.user.pk:
            raise ValidationError({'detail': 'You cannot delete your own account.'})
        self._protect_last_admin(user, 'customer', False)
        if self._has_related_records(user.pk):
            raise ValidationError({
                'detail': 'This account has related orders, reviews, cart items, or recommendation history and cannot be deleted. Deactivate it instead.'
            })
        photo_path = user.photo_url.removeprefix(settings.MEDIA_URL) if user.photo_url and user.photo_url.startswith(settings.MEDIA_URL) else None
        user.delete()
        if photo_path:
            transaction.on_commit(lambda: default_storage.delete(photo_path))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _protect_last_admin(user, role, is_active):
        if (user.role == 'admin' or user.is_admin) and user.is_active and not (role == 'admin' and is_active):
            active_admins = StoreUser.objects.filter(is_active=True).filter(Q(role='admin') | Q(is_admin=True)).count()
            if active_admins <= 1:
                raise ValidationError({'detail': 'The last active administrator cannot be demoted, deactivated, or deleted.'})

    @staticmethod
    def _has_related_records(user_id):
        existing_tables = set(connection.introspection.table_names())
        for table in ('orders', 'reviews', 'cart_items', 'recommendation_events'):
            if table not in existing_tables:
                continue
            quoted_table = connection.ops.quote_name(table)
            with connection.cursor() as cursor:
                cursor.execute(f'SELECT 1 FROM {quoted_table} WHERE user_id = %s LIMIT 1', [user_id])
                if cursor.fetchone():
                    return True
        return False


class AdminUserActiveView(APIView):
    permission_classes = [IsStoreAdmin]

    @transaction.atomic
    def patch(self, request, user_id):
        try:
            user = StoreUser.objects.select_for_update().get(pk=user_id)
        except StoreUser.DoesNotExist as error:
            raise NotFound('User not found.') from error
        value = request.data.get('is_active', request.query_params.get('is_active'))
        if not isinstance(value, bool):
            if value not in ('true', 'false', '1', '0'):
                raise ValidationError({'is_active': 'Choose true or false.'})
            value = value in ('true', '1')
        if user.pk == request.user.pk:
            raise ValidationError({'detail': 'You cannot change your own account status.'})
        AdminUserDetailView._protect_last_admin(user, user.role, value)
        user.is_active = value
        user.token_version += 1
        user.save(update_fields=['is_active', 'token_version'])
        return Response(StoreUserSerializer(user).data)


class AdminUserPhotoView(APIView):
    permission_classes = [IsStoreAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, user_id):
        try:
            user = StoreUser.objects.get(pk=user_id)
        except StoreUser.DoesNotExist as error:
            raise NotFound('User not found.') from error
        user = save_profile_photo(request, user)
        return Response(StoreUserSerializer(user).data)


class AdminProfilePhotoView(APIView):
    permission_classes = [IsStoreAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = save_profile_photo(request, request.user)
        return Response(StoreUserSerializer(user).data)
