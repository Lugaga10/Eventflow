# events/urls.py — replace entire file
from django.urls import path
from . import views

urlpatterns = [
    # Public
    path("public/",                          views.public_events,        name="public_events"),
    path("public/<int:pk>/",                 views.event_detail,         name="event_detail"),

    # Organizer event management
    path("my/",                              views.my_events,            name="my_events"),
    path("create/",                          views.create_event,         name="create_event"),
    path("<int:pk>/",                        views.event_detail_manage,  name="event_detail_manage"),

    # Ticket tiers
    path("<int:event_pk>/tiers/",            views.tier_list_create,     name="tier_list_create"),
    path("<int:event_pk>/tiers/<int:tier_pk>/", views.tier_detail,       name="tier_detail"),

    # Organizer public profile
    path("organizer/<int:organizer_id>/",    views.organizer_profile,    name="organizer_profile"),
    path("organizer/update-profile/",        views.update_org_profile,   name="update_org_profile"),
]
