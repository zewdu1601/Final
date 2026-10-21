from django.db import models


class StoreUser(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=255)
    username = models.CharField(max_length=100)
    hashed_password = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    role = models.CharField(max_length=30, default='customer')
    photo_url = models.CharField(max_length=500, null=True, blank=True)
    token_version = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'users'
        ordering = ['-created_at', '-id']

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return self.is_admin or self.role == 'admin'

    def __str__(self):
        return self.username
