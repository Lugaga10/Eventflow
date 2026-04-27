from rest_framework import serializers
from .models import Booking
from events.models import TicketTier


class TicketTierSerializer(serializers.ModelSerializer):
    is_available = serializers.ReadOnlyField()
    sold_out = serializers.ReadOnlyField()
    fill_percentage = serializers.ReadOnlyField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = TicketTier
        fields = [
            'id', 'name', 'category', 'category_display',
            'price', 'quantity', 'available',
            'description', 'perks',
            'sale_ends', 'is_available', 'sold_out', 'fill_percentage',
        ]


class BookingSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateTimeField(source='event.date', read_only=True)
    event_venue = serializers.CharField(source='event.venue', read_only=True)
    event_city = serializers.CharField(source='event.city', read_only=True)
    event_image = serializers.ImageField(source='event.image', read_only=True)
    tier_name = serializers.CharField(source='ticket_tier.name', read_only=True)
    tier_category = serializers.CharField(source='ticket_tier.category', read_only=True)
    tier_category_display = serializers.CharField(
        source='ticket_tier.get_category_display', read_only=True
    )
    attendee_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_code', 'ticket_issued', 'ticket_issued_at',
            'event', 'event_title', 'event_date', 'event_venue', 'event_city', 'event_image',
            'ticket_tier', 'tier_name', 'tier_category', 'tier_category_display',
            'quantity', 'total_price',
            'payment_status', 'payment_method',
            'paypal_order_id', 'mpesa_checkout_request_id', 'phone_number',
            'attendee_name', 'created_at',
        ]
        read_only_fields = ['booking_code', 'ticket_issued', 'ticket_issued_at', 'created_at']

    def get_attendee_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name.strip() else obj.user.username


class DigitalTicketSerializer(serializers.ModelSerializer):
    """
    Serializer for the digital ticket display. Returns all data needed
    to render the full ticket card + QR code on the frontend.
    """
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateTimeField(source='event.date', read_only=True)
    event_end_date = serializers.DateTimeField(source='event.end_date', read_only=True)
    event_venue = serializers.CharField(source='event.venue', read_only=True)
    event_city = serializers.CharField(source='event.city', read_only=True)
    event_image = serializers.ImageField(source='event.image', read_only=True)
    event_organizer = serializers.SerializerMethodField()

    tier_name = serializers.CharField(source='ticket_tier.name', read_only=True)
    tier_category = serializers.CharField(source='ticket_tier.category', read_only=True)
    tier_category_display = serializers.CharField(
        source='ticket_tier.get_category_display', read_only=True
    )
    tier_perks = serializers.JSONField(source='ticket_tier.perks', read_only=True)

    attendee_name = serializers.SerializerMethodField()
    attendee_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_code', 'ticket_issued', 'ticket_issued_at',
            'event_title', 'event_date', 'event_end_date',
            'event_venue', 'event_city', 'event_image', 'event_organizer',
            'tier_name', 'tier_category', 'tier_category_display', 'tier_perks',
            'quantity', 'total_price', 'payment_method',
            'attendee_name', 'attendee_email',
            'created_at',
        ]

    def get_attendee_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name.strip() else obj.user.username

    def get_event_organizer(self, obj):
        org = obj.event.organizer
        return getattr(org, 'org_name', None) or org.get_full_name() or org.username
