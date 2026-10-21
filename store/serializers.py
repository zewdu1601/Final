from rest_framework import serializers
from passlib.context import CryptContext

from .models import StoreUser

password_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class StoreUserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = StoreUser
        fields = (
            'id',
            'email',
            'username',
            'full_name',
            'role',
            'is_admin',
            'is_active',
            'photo_url',
            'created_at',
        )
        read_only_fields = ('id', 'is_admin', 'photo_url', 'created_at')

    def validate_email(self, value):
        value = value.strip().lower()
        matches = StoreUser.objects.filter(email__iexact=value)
        if self.instance:
            matches = matches.exclude(pk=self.instance.pk)
        if matches.exists():
            raise serializers.ValidationError('Email is already in use.')
        return value

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Username cannot be blank.')
        matches = StoreUser.objects.filter(username__iexact=value)
        if self.instance:
            matches = matches.exclude(pk=self.instance.pk)
        if matches.exists():
            raise serializers.ValidationError('Username is already in use.')
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Full name cannot be blank.')
        return value

    def validate_role(self, value):
        if value not in {'admin', 'manager', 'customer'}:
            raise serializers.ValidationError('Choose admin, manager, or customer.')
        return value

    def update(self, instance, validated_data):
        if 'role' in validated_data:
            validated_data['is_admin'] = validated_data['role'] == 'admin'
        return super().update(instance, validated_data)


class AdminCreateUserSerializer(StoreUserSerializer):
    password = serializers.CharField(write_only=True, min_length=10, max_length=72)

    class Meta(StoreUserSerializer.Meta):
        fields = StoreUserSerializer.Meta.fields + ('password',)
        read_only_fields = ('id', 'is_admin', 'photo_url', 'created_at')

    def validate_password(self, value):
        if len(value.encode('utf-8')) > 72:
            raise serializers.ValidationError('Password must be no more than 72 UTF-8 bytes.')
        if not any(char.islower() for char in value) or not any(char.isupper() for char in value) or not any(char.isdigit() for char in value):
            raise serializers.ValidationError('Password must include an uppercase letter, a lowercase letter, and a number.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.pop('role', 'customer')
        validated_data.pop('is_active', None)
        return StoreUser.objects.create(
            **validated_data,
            role=role,
            is_admin=role == 'admin',
            is_active=True,
            hashed_password=password_context.hash(password),
        )


class RegisterUserSerializer(StoreUserSerializer):
    password = serializers.CharField(write_only=True, min_length=6, max_length=72)

    class Meta(StoreUserSerializer.Meta):
        fields = StoreUserSerializer.Meta.fields + ('password',)
        read_only_fields = ('id', 'is_admin', 'photo_url', 'created_at')

    def validate_password(self, value):
        if len(value.encode('utf-8')) > 72:
            raise serializers.ValidationError('Password must be no more than 72 UTF-8 bytes.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('role', None)
        validated_data.pop('is_active', None)
        return StoreUser.objects.create(
            **validated_data,
            role='customer',
            is_admin=False,
            is_active=True,
            hashed_password=password_context.hash(password),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False, max_length=100)
    password = serializers.CharField(write_only=True, max_length=72)

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('username'):
            raise serializers.ValidationError({'detail': 'Enter an email address or username.'})
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, max_length=72)
    new_password = serializers.CharField(write_only=True, min_length=10, max_length=72)
    confirm_password = serializers.CharField(write_only=True, min_length=10, max_length=72)

    def validate(self, attrs):
        password = attrs['new_password']
        if len(password.encode('utf-8')) > 72:
            raise serializers.ValidationError({'new_password': 'Password must be no more than 72 UTF-8 bytes.'})
        if not any(char.islower() for char in password) or not any(char.isupper() for char in password) or not any(char.isdigit() for char in password):
            raise serializers.ValidationError({'new_password': 'Password must include an uppercase letter, a lowercase letter, and a number.'})
        if password != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Password confirmation does not match.'})
        if password == attrs['current_password']:
            raise serializers.ValidationError({'new_password': 'Choose a password different from the current password.'})
        return attrs


class AdminProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    username = serializers.CharField(min_length=3, max_length=100)
    email = serializers.EmailField(max_length=255)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Username cannot be blank.')
        if StoreUser.objects.filter(username__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Username is already in use.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if StoreUser.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Email is already in use.')
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Full name cannot be blank.')
        return value
