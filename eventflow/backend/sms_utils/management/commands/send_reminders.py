"""
Management command: python manage.py send_reminders

Run this via cron job if you don't want to set up Celery.

Example crontab (crontab -e):
  0 8 * * * cd /path/to/backend && python manage.py send_reminders
  0 6 * * * cd /path/to/backend && python manage.py send_day_reminders
  0 0 * * * cd /path/to/backend && python manage.py cleanup_events
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = "Send 3-day reminder SMS to upcoming event attendees"

    def handle(self, *args, **kwargs):
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
            send_reminder_sms(booking)
            count += 1
            self.stdout.write(f"  Reminder sent → {booking.attendee_name} ({booking.attendee_phone})")

        self.stdout.write(self.style.SUCCESS(f"Done. {count} reminders sent."))
