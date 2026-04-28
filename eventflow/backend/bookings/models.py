import uuid
from django.db import models
from django.contrib.auth import get_user_model
from events.models import Event, TicketTier

User = get_user_model()


def generate_booking_code():
    """Generate a unique 10-character uppercase alphanumeric booking code."""
    return uuid.uuid4().hex[:10].upper()


class Booking(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('paypal', 'PayPal'),
        ('free', 'Free'),
    ]

    # Core
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    ticket_tier = models.ForeignKey(
        TicketTier, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings'
    )
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Payment
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='mpesa')
    paypal_order_id = models.CharField(max_length=100, blank=True)

    # M-Pesa fields
    phone_number = models.CharField(max_length=20, blank=True)
    mpesa_checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    mpesa_merchant_request_id = models.CharField(max_length=100, blank=True)
    mpesa_receipt = models.CharField(max_length=50, blank=True)

    # Digital ticket
    booking_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_booking_code,
        help_text='Unique code for digital ticket and venue check-in'
    )
    ticket_issued = models.BooleanField(default=False)
    ticket_issued_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        tier_label = self.ticket_tier.get_category_display() if self.ticket_tier else 'N/A'
        return f"{self.booking_code} – {self.user.username} – {self.event.title} [{tier_label}]"

    def confirm_and_issue_ticket(self):
        """Mark booking as completed and issue the digital ticket."""
        from django.utils import timezone
        self.payment_status = 'completed'
        self.ticket_issued = True
        self.ticket_issued_at = timezone.now()
        # Decrement available count on the tier
        if self.ticket_tier and self.ticket_tier.available >= self.quantity:
            self.ticket_tier.available -= self.quantity
            self.ticket_tier.save(update_fields=['available'])
        self.save()
        # bookings/models.py
confirmation_sms_sent = models.BooleanField(default=False)
