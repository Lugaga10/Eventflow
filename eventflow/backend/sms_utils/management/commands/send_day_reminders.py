from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Send day-of SMS reminders to today's event attendees"

    def handle(self, *args, **kwargs):
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
            send_day_of_sms(booking)
            count += 1
            self.stdout.write(f"  Day-of SMS → {booking.attendee_name} ({booking.attendee_phone})")

        self.stdout.write(self.style.SUCCESS(f"Done. {count} day-of messages sent."))
