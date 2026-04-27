"""
Celery configuration for EventFlow.
This file is imported by Django's manage.py and wsgi.py automatically.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eventflow.settings")
app = Celery("eventflow")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# ─── Scheduled Tasks (Celery Beat) ────────────────────────────────────────────
app.conf.beat_schedule = {
    # Send 3-day reminders every day at 8:00 AM Nairobi time
    "send-event-reminders": {
        "task": "sms_utils.tasks.send_event_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    # Send day-of reminders every day at 6:00 AM
    "send-day-of-reminders": {
        "task": "sms_utils.tasks.send_day_of_reminders",
        "schedule": crontab(hour=6, minute=0),
    },
    # Delete past events every day at midnight
    "delete-past-events": {
        "task": "sms_utils.tasks.delete_past_events",
        "schedule": crontab(hour=0, minute=0),
    },
}

app.conf.timezone = "Africa/Nairobi"
