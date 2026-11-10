from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/csrf/", views.csrf_token, name="csrf-token"),
    path("api/auth/", views.auth_status, name="auth-status"),
    path("api/signup/", views.signup, name="signup"),
    path("api/login/", views.login_view, name="login"),
    path("api/logout/", views.logout_view, name="logout"),
    path("api/progress/", views.progress, name="progress"),
    path("api/map-data/", views.map_data, name="map-data"),
]
