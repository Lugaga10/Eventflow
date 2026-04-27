from django.contrib import admin
from .models import Event, TicketTier


class TicketTierInline(admin.TabularInline):
    model = TicketTier
    extra = 1
    fields = ['category', 'name', 'price', 'quantity', 'available', 'description', 'sale_ends']
    readonly_fields = []


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):

    def total_capacity(self, obj):
        return obj.total_capacity
    total_capacity.short_description = 'Capacity'

    def total_available(self, obj):
        return obj.total_available
    total_available.short_description = 'Available'

    list_display = [
        'title', 'category', 'organizer', 'date',
        'city', 'venue', 'status',
        'total_capacity', 'total_available',
    ]
    list_filter = ['status', 'category', 'city']
    search_fields = ['title', 'organizer__username', 'organizer__email', 'venue', 'city']
    ordering = ['-date']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'updated_at']
    inlines = [TicketTierInline]

    fieldsets = (
        ('Event Details', {
            'fields': ('title', 'description', 'category', 'status', 'organizer')
        }),
        ('Date & Location', {
            'fields': ('date', 'end_date', 'venue', 'city')
        }),
        ('Media', {
            'fields': ('image',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(TicketTier)
class TicketTierAdmin(admin.ModelAdmin):

    def fill_pct(self, obj):
        return f"{obj.fill_percentage}%"
    fill_pct.short_description = 'Fill %'

    list_display = [
        'event', 'category', 'name', 'price',
        'quantity', 'available', 'fill_pct', 'sale_ends',
    ]
    list_filter = ['category']
    search_fields = ['event__title', 'name']
    ordering = ['event', 'category']
