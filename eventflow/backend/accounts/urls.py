from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("admin-login/", views.admin_login),
    path("me/", views.me),
    path("admin-me/", views.admin_me),
]
path("auth/google/", views.google_auth),