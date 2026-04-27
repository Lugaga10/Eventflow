from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    def attendee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    attendee_name.short_description = 'Attendee'

    def tier_label(self, obj):
        return obj.ticket_tier.get_category_display() if obj.ticket_tier else '—'
    tier_label.short_description = 'Tier'

    list_display = [
        'booking_code', 'attendee_name', 'event', 'tier_label',
        'quantity', 'total_price', 'payment_method',
        'payment_status', 'ticket_issued', 'created_at',
    ]
    list_filter = ['payment_status', 'payment_method', 'ticket_issued']
    search_fields = [
        'booking_code', 'user__username', 'user__email',
        'user__first_name', 'user__last_name',
        'event__title', 'mpesa_checkout_request_id', 'mpesa_receipt',
    ]
    readonly_fields = [
        'booking_code', 'ticket_issued', 'ticket_issued_at',
        'mpesa_checkout_request_id', 'mpesa_merchant_request_id',
        'mpesa_receipt', 'created_at', 'updated_at',
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_code', 'user', 'event', 'ticket_tier', 'quantity', 'total_price')
        }),
        ('Payment', {
            'fields': ('payment_status', 'payment_method', 'phone_number', 'paypal_order_id')
        }),
        ('M-Pesa', {
            'fields': ('mpesa_checkout_request_id', 'mpesa_merchant_request_id', 'mpesa_receipt'),
            'classes': ('collapse',),
        }),
        ('Digital Ticket', {
            'fields': ('ticket_issued', 'ticket_issued_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
