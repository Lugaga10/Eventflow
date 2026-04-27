from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    title = models.CharField(max_length=255)
    description = models.TextField()
    date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Nairobi')
    image = models.ImageField(upload_to='events/', null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='published')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.title

    @property
    def total_capacity(self):
        return sum(tier.quantity for tier in self.ticket_tiers.all())

    @property
    def total_available(self):
        return sum(tier.available for tier in self.ticket_tiers.all())

    @property
    def is_sold_out(self):
        return self.total_available == 0


class TicketTier(models.Model):
    """
    Represents a ticket category for an event.
    Categories: Early Bird (limited, discounted), Regular, VIP, VVIP.
    """

    CATEGORY_CHOICES = [
        ('early_bird', 'Early Bird'),
        ('regular', 'Regular'),
        ('vip', 'VIP'),
        ('vvip', 'VVIP'),
    ]

    # Maps category to display order (ascending)
    CATEGORY_ORDER = {
        'early_bird': 0,
        'regular': 1,
        'vip': 2,
        'vvip': 3,
    }

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_tiers')
    name = models.CharField(max_length=100)  # e.g. "Early Bird Special", "General Admission"
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='regular',
        help_text='Predefined category determining tier level and UI styling'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(help_text='Total tickets in this tier')
    available = models.PositiveIntegerField(help_text='Remaining tickets')
    description = models.TextField(blank=True, help_text='Short tagline for this tier')
    perks = models.JSONField(
        default=list,
        blank=True,
        help_text='List of perk strings, e.g. ["Front-row seating", "VIP lounge access"]'
    )
    sale_ends = models.DateTimeField(
        null=True, blank=True,
        help_text='If set, tier is unavailable after this datetime (useful for Early Bird)'
    )

    class Meta:
        ordering = ['category']  # Will sort by category string; use CATEGORY_ORDER for custom sort

    def __str__(self):
        return f"{self.event.title} â€“ {self.get_category_display()} ({self.name})"

    @property
    def is_available(self):
        from django.utils import timezone
        if self.sale_ends and timezone.now() > self.sale_ends:
            return False
        return self.available > 0

    @property
    def sold_out(self):
        return self.available <= 0

    @property
    def fill_percentage(self):
        if self.quantity == 0:
            return 100
        return round(((self.quantity - self.available) / self.quantity) * 100, 1)
