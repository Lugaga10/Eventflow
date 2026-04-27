from django.urls import path
from . import admin_views

urlpatterns = [
    path("events/", admin_views.admin_events),
    path("events/<int:pk>/", admin_views.admin_event_detail),
    path("users/", admin_views.admin_users),
    path("users/<int:pk>/toggle/", admin_views.admin_toggle_user),
    path("bookings/", admin_views.admin_bookings),
    path("sms-logs/", admin_views.admin_sms_logs),
]
