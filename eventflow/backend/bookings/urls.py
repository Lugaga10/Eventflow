# bookings/urls.py — replace entire file
from django.urls import path
from . import views

urlpatterns = [
    path("create/",       views.create_booking,     name="create_booking"),
    path("my/",           views.my_bookings,         name="my_bookings"),
    path("my-events/",    views.my_event_bookings,   name="my_event_bookings"),
    path("bulk-sms/",     views.bulk_sms,            name="bulk_sms"),
]
