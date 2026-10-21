"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path

from store.views import (
    AdminProfilePhotoView,
    AdminProfileView,
    AdminUserActiveView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserPhotoView,
    ChangePasswordView,
    CurrentUserView,
    LoginView,
    RegisterView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login', LoginView.as_view(), name='api-login'),
    path('api/auth/register', RegisterView.as_view(), name='api-register'),
    path('api/auth/me', CurrentUserView.as_view(), name='api-current-user'),
    path('api/auth/logout', CurrentUserView.as_view(), name='api-logout'),
    path('api/auth/change-password', ChangePasswordView.as_view(), name='api-change-password'),
    path('api/admin/profile', AdminProfileView.as_view(), name='admin-profile'),
    path('api/admin/profile/photo', AdminProfilePhotoView.as_view(), name='admin-profile-photo'),
    path('api/admin/users', AdminUserListView.as_view(), name='admin-users'),
    path('api/admin/users/<int:user_id>', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('api/admin/users/<int:user_id>/active', AdminUserActiveView.as_view(), name='admin-user-active'),
    path('api/admin/users/<int:user_id>/photo', AdminUserPhotoView.as_view(), name='admin-user-photo'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
