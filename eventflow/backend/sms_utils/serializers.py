from rest_framework import serializers
from .models import SMSLog


class SMSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSLog
        fields = ["id", "recipient", "message", "sms_type", "status", "error", "sent_at"]
