"""
Management command: python manage.py cleanup_events

Deletes events older than 7 days. Run via cron daily at midnight.

Crontab:
  0 0 * * * cd /path/to/backend && python manage.py cleanup_events
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = "Delete past events older than 7 days"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Grace period in days after event date before deletion (default: 7)",
        )

    def handle(self, *args, **kwargs):
        from events.models import Event

        grace_days = kwargs["days"]
        cutoff = timezone.now().date() - timedelta(days=grace_days)
        old = Event.objects.filter(date__lt=cutoff)
        count = old.count()
        titles = list(old.values_list("title", flat=True))
        old.delete()

        for t in titles:
            self.stdout.write(f"  Deleted: {t}")
        self.stdout.write(self.style.SUCCESS(f"Done. {count} events removed."))
