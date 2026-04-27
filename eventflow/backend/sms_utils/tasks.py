"""
Celery Scheduled Tasks
=======================
These tasks run automatically on a schedule using Celery Beat.

Tasks:
  1. send_event_reminders     → runs daily at 8 AM, sends 3-day reminder SMS
  2. send_day_of_reminders    → runs daily at 6 AM, sends same-day SMS to attendees
  3. delete_past_events       → runs daily at midnight, removes events older than 7 days

SETUP (required to use these tasks):
  pip install celery redis django-celery-beat

  In settings.py, add:
    INSTALLED_APPS += ['django_celery_beat']
    CELERY_BROKER_URL = 'redis://localhost:6379/0'

  Run Redis (install from https://redis.io):
    redis-server

  Run Celery worker (in a new terminal, inside backend/):
    celery -A eventflow worker --loglevel=info

  Run Celery Beat scheduler (in another terminal):
    celery -A eventflow beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  OR: Use the simpler management command approach (no Celery needed):
    python manage.py send_reminders   ← run this from cron/task scheduler
    python manage.py cleanup_events   ← run this from cron/task scheduler
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_event_reminders():
    """
    Send 3-day reminder SMS to all confirmed attendees
    whose event is exactly 3 days away.
    Runs daily at 8:00 AM (Nairobi time).
    """
    from bookings.models import Booking
    from sms_utils.utils import send_reminder_sms

    target_date = (timezone.now() + timedelta(days=3)).date()
    bookings = Booking.objects.filter(
        event__date=target_date,
        status="confirmed",
        reminder_sms_sent=False,
    ).select_related("event")

    count = 0
    for booking in bookings:
        try:
            send_reminder_sms(booking)
            count += 1
        except Exception as e:
            logger.error(f"Reminder SMS failed for booking {booking.id}: {e}")

    logger.info(f"Sent {count} 3-day reminder SMS messages")
    return f"Sent {count} reminders"


@shared_task
def send_day_of_reminders():
    """
    Send day-of SMS to confirmed attendees on the morning of their event.
    Runs daily at 6:00 AM (Nairobi time).
    """
    from bookings.models import Booking
    from sms_utils.utils import send_day_of_sms

    today = timezone.now().date()
    bookings = Booking.objects.filter(
        event__date=today,
        status="confirmed",
        day_of_sms_sent=False,
    ).select_related("event")

    count = 0
    for booking in bookings:
        try:
            send_day_of_sms(booking)
            count += 1
        except Exception as e:
            logger.error(f"Day-of SMS failed for booking {booking.id}: {e}")

    logger.info(f"Sent {count} day-of SMS messages")
    return f"Sent {count} day-of messages"


@shared_task
def delete_past_events():
    """
    Automatically delete events that ended more than 7 days ago.
    Runs daily at midnight.
    Adjust the grace period (7 days) as needed.
    """
    from events.models import Event

    cutoff = timezone.now().date() - timedelta(days=7)
    old_events = Event.objects.filter(date__lt=cutoff)
    count = old_events.count()
    old_events.delete()

    logger.info(f"Auto-deleted {count} past events (older than 7 days)")
    return f"Deleted {count} past events"
