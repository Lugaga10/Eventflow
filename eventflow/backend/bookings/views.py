# bookings/views.py — replace entire file
import uuid
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Booking
from events.models import Event, TicketTier

logger = logging.getLogger(__name__)


def generate_booking_code():
    return "EF-" + uuid.uuid4().hex[:6].upper()


@api_view(["POST"])
@permission_classes([AllowAny])
def create_booking(request):
    """
    Create a booking. Accepts:
      event_id, ticket_tier_id (optional), attendee_name,
      attendee_email, attendee_phone, tickets, mpesa_code (optional)
    """
    data            = request.data
    event_id        = data.get("event")
    tier_id         = data.get("ticket_tier_id")
    attendee_name   = data.get("attendee_name", "").strip()
    attendee_email  = data.get("attendee_email", "").strip()
    attendee_phone  = data.get("attendee_phone", "").strip()
    tickets         = int(data.get("tickets", 1))
    mpesa_code      = data.get("mpesa_code", "").strip()

    # Validate required fields
    if not all([event_id, attendee_name, attendee_email, attendee_phone]):
        return Response({"error": "event, attendee_name, attendee_email, attendee_phone are required."}, status=400)

    # Get event
    try:
        event = Event.objects.get(pk=event_id, is_active=True)
    except Event.DoesNotExist:
        return Response({"error": "Event not found."}, status=404)

    # Get tier if specified
    tier = None
    if tier_id:
        try:
            tier = TicketTier.objects.get(pk=tier_id, event=event, is_active=True)
        except TicketTier.DoesNotExist:
            return Response({"error": "Ticket tier not found."}, status=404)

        # Check tier capacity
        if tier.spots_left < tickets:
            return Response({"error": f"Only {tier.spots_left} spots left in this tier."}, status=400)
    else:
        # Check overall event capacity
        if event.spots_left < tickets:
            return Response({"error": f"Only {event.spots_left} spots left."}, status=400)

    # Calculate total
    unit_price   = tier.price if tier else event.price
    total_amount = unit_price * tickets
    is_free      = unit_price == 0

    booking = Booking.objects.create(
        event          = event,
        ticket_tier    = tier,
        user           = request.user if request.user.is_authenticated else None,
        attendee_name  = attendee_name,
        attendee_email = attendee_email,
        attendee_phone = attendee_phone,
        tickets        = tickets,
        total_amount   = total_amount,
        status         = "confirmed" if (is_free or mpesa_code) else "pending",
        payment_method = "free" if is_free else "mpesa",
        mpesa_code     = mpesa_code,
        booking_code   = generate_booking_code(),
    )

    # Send confirmation SMS
    if booking.status == "confirmed":
        try:
            from sms_utils.utils import send_booking_confirmation_sms
            send_booking_confirmation_sms(
                phone        = attendee_phone,
                booking_code = booking.booking_code,
                event_title  = event.title,
                event_date   = str(event.date),
            )
            booking.confirmation_sms_sent = True
            booking.save(update_fields=["confirmation_sms_sent"])
        except Exception as e:
            logger.warning(f"Confirmation SMS failed: {e}")

    tier_name = tier.name if tier else "Standard"
    return Response({
        "booking_code":    booking.booking_code,
        "status":          booking.status,
        "total_amount":    str(booking.total_amount),
        "tickets":         booking.tickets,
        "ticket_tier":     tier_name,
        "event_title":     event.title,
    }, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookings(request):
    """Return all bookings for the logged-in attendee."""
    bookings = Booking.objects.filter(user=request.user).select_related("event", "ticket_tier")
    data = [
        {
            "id":             b.id,
            "event_title":    b.event.title,
            "event_date":     str(b.event.date),
            "event_time":     str(b.event.time),
            "event_venue":    b.event.venue,
            "ticket_tier":    b.ticket_tier.name if b.ticket_tier else "Standard",
            "tickets":        b.tickets,
            "total_amount":   str(b.total_amount),
            "status":         b.status,
            "booking_code":   b.booking_code,
            "mpesa_code":     b.mpesa_code,
            "created_at":     b.created_at.strftime("%Y-%m-%d"),
        }
        for b in bookings
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_event_bookings(request):
    """Return all bookings for the organizer's events."""
    bookings = Booking.objects.filter(
        event__organizer=request.user
    ).select_related("event", "ticket_tier").order_by("-created_at")
    data = [
        {
            "id":            b.id,
            "event_title":   b.event.title,
            "event":         b.event.id,
            "attendee_name": b.attendee_name,
            "attendee_phone":b.attendee_phone,
            "ticket_tier":   b.ticket_tier.name if b.ticket_tier else "Standard",
            "tickets":       b.tickets,
            "total_amount":  str(b.total_amount),
            "status":        b.status,
            "booking_code":  b.booking_code,
            "created_at":    b.created_at.strftime("%Y-%m-%d"),
        }
        for b in bookings
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_sms(request):
    """Send automated SMS to all confirmed attendees of an event."""
    from sms_utils.utils import send_sms, send_booking_confirmation_sms, send_event_reminder_sms

    event_id       = request.data.get("event_id")
    sms_type       = request.data.get("sms_type", "reminder")
    custom_message = request.data.get("message", "")

    if not event_id:
        return Response({"error": "event_id is required."}, status=400)

    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response({"error": "Event not found or not yours."}, status=404)

    bookings = Booking.objects.filter(event=event, status="confirmed")
    if not bookings.exists():
        return Response({"message": "No confirmed attendees for this event."})

    sent, failed = [], []
    for booking in bookings:
        try:
            if sms_type == "confirmation":
                ok = send_booking_confirmation_sms(
                    phone=booking.attendee_phone,
                    booking_code=booking.booking_code,
                    event_title=event.title,
                    event_date=str(event.date),
                )
            elif sms_type == "reminder":
                ok = send_event_reminder_sms(
                    phone=booking.attendee_phone,
                    event_title=event.title,
                    event_date=str(event.date),
                    event_time=str(event.time),
                )
            elif sms_type == "update":
                ok = send_sms(booking.attendee_phone, f"EVENTFLOW: Important update for {event.title} on {event.date}. Please check the EventFlow platform.")
            elif sms_type == "custom":
                if not custom_message:
                    return Response({"error": "message required for custom SMS."}, status=400)
                ok = send_sms(booking.attendee_phone, custom_message)
            else:
                return Response({"error": f"Unknown sms_type: {sms_type}"}, status=400)

            (sent if ok else failed).append(booking.attendee_phone)
        except Exception as e:
            logger.error(f"Bulk SMS error {booking.attendee_phone}: {e}")
            failed.append(booking.attendee_phone)

    return Response({"message": f"SMS sent to {len(sent)} attendee(s).", "sent_count": len(sent), "failed_count": len(failed), "sent": sent, "failed": failed})
