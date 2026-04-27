from django.contrib import admin
from .models import SMSLog


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ["recipient", "sms_type", "status", "sent_at", "provider_message_id"]
    list_filter = ["sms_type", "status"]
    search_fields = ["recipient", "message"]
    readonly_fields = ["sent_at"]
    ordering = ["-sent_at"]
