# accounts/models.py — replace entire file
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("organizer", "Organizer"),
        ("attendee",  "Attendee"),
        ("admin",     "Admin"),
    ]
    role  = models.CharField(max_length=20, choices=ROLE_CHOICES, default="attendee")
    phone = models.CharField(max_length=20, blank=True)

    # Organizer "company" profile fields
    org_name        = models.CharField(max_length=150, blank=True, help_text="Display name shown publicly (e.g. TechKenya Events)")
    org_description = models.TextField(blank=True, help_text="Short bio shown on the organizer public profile")
    org_website     = models.CharField(max_length=255, blank=True)
    org_logo        = models.CharField(max_length=500, blank=True, help_text="URL to organizer logo/banner image")

    def __str__(self):
        return self.username

    @property
    def display_name(self):
        """Return org_name if set, otherwise fall back to full name."""
        return self.org_name or f"{self.first_name} {self.last_name}".strip() or self.username
