from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("django-admin/", admin.site.urls),  # Django's built-in admin (separate from our custom admin)
    path("api/auth/", include("accounts.urls")),
    path("api/events/", include("events.urls")),
    path("api/bookings/", include("bookings.urls")),
    path("api/admin/", include("accounts.admin_urls")),
    path("api/mpesa/", include("mpesa.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
