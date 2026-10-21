from jose import JWTError, jwt
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from django.conf import settings

from .models import StoreUser


class StoreJWTAuthentication(BaseAuthentication):
    keyword = b'bearer'

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts:
            return None
        if parts[0].lower() != self.keyword:
            return None
        if len(parts) != 2:
            raise AuthenticationFailed('Invalid authorization header.')

        try:
            token = parts[1].decode('utf-8')
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = int(payload['sub'])
            token_version = int(payload.get('ver', 0))
            user = StoreUser.objects.get(pk=user_id)
        except (JWTError, KeyError, TypeError, ValueError, UnicodeDecodeError, StoreUser.DoesNotExist) as error:
            raise AuthenticationFailed('Invalid or expired credentials.') from error

        if not user.is_active or token_version != user.token_version:
            raise AuthenticationFailed('This account is inactive or its session has expired.')
        return user, token

    def authenticate_header(self, request):
        return 'Bearer'
