from django.db import models


class SMSLog(models.Model):
    SMS_TYPE_CHOICES = [
        ("confirmation", "Booking Confirmation"),
        ("reminder", "3-Day Reminder"),
        ("day_of", "Day-of Reminder"),
        ("update", "Event Update"),
        ("organizer", "Organizer Notice"),
        ("general", "General"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    recipient = models.CharField(max_length=20)
    message = models.TextField()
    sms_type = models.CharField(max_length=20, choices=SMS_TYPE_CHOICES, default="general")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    provider_message_id = models.CharField(max_length=100, blank=True)
    error = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"SMS to {self.recipient} [{self.sms_type}] - {self.status}"
