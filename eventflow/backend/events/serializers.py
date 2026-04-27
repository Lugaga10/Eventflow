# events/serializers.py — replace entire file
from rest_framework import serializers
from .models import Event, TicketTier


class TicketTierSerializer(serializers.ModelSerializer):
    booked     = serializers.ReadOnlyField()
    spots_left = serializers.ReadOnlyField()

    class Meta:
        model  = TicketTier
        fields = ["id", "name", "tier_type", "price", "capacity",
                  "description", "is_active", "booked", "spots_left"]


class EventSerializer(serializers.ModelSerializer):
    booked        = serializers.ReadOnlyField()
    spots_left    = serializers.ReadOnlyField()
    organizer_name= serializers.ReadOnlyField()
    organizer_id  = serializers.ReadOnlyField()
    ticket_tiers  = TicketTierSerializer(many=True, read_only=True)
    has_tiers     = serializers.SerializerMethodField()

    class Meta:
        model  = Event
        fields = [
            "id", "title", "type", "description", "date", "time",
            "venue", "city", "price", "capacity", "image",
            "is_featured", "is_active", "created_at",
            "organizer_name", "organizer_id",
            "booked", "spots_left", "ticket_tiers", "has_tiers",
        ]

    def get_has_tiers(self, obj):
        return obj.ticket_tiers.filter(is_active=True).exists()
