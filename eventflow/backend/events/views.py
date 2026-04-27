# events/views.py — replace entire file
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Event, TicketTier
from .serializers import EventSerializer, TicketTierSerializer


# ── Public event endpoints ────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def public_events(request):
    events = Event.objects.filter(is_active=True).order_by("date", "time")
    return Response(EventSerializer(events, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def event_detail(request, pk):
    try:
        event = Event.objects.get(pk=pk, is_active=True)
    except Event.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    return Response(EventSerializer(event).data)


# ── Organizer event endpoints ─────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_events(request):
    events = Event.objects.filter(organizer=request.user).order_by("-created_at")
    return Response(EventSerializer(events, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_event(request):
    serializer = EventSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(organizer=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def event_detail_manage(request, pk):
    try:
        event = Event.objects.get(pk=pk, organizer=request.user)
    except Event.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    if request.method == "GET":
        return Response(EventSerializer(event).data)

    if request.method in ["PUT", "PATCH"]:
        serializer = EventSerializer(event, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == "DELETE":
        event.delete()
        return Response(status=204)


# ── Ticket Tier endpoints ─────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tier_list_create(request, event_pk):
    """List all tiers for an event or create a new tier."""
    try:
        event = Event.objects.get(pk=event_pk, organizer=request.user)
    except Event.DoesNotExist:
        return Response({"detail": "Event not found or not yours."}, status=404)

    if request.method == "GET":
        tiers = event.ticket_tiers.all()
        return Response(TicketTierSerializer(tiers, many=True).data)

    if request.method == "POST":
        serializer = TicketTierSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(event=event)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def tier_detail(request, event_pk, tier_pk):
    """Update or delete a specific ticket tier."""
    try:
        event = Event.objects.get(pk=event_pk, organizer=request.user)
        tier  = TicketTier.objects.get(pk=tier_pk, event=event)
    except (Event.DoesNotExist, TicketTier.DoesNotExist):
        return Response({"detail": "Not found."}, status=404)

    if request.method == "DELETE":
        tier.delete()
        return Response(status=204)

    serializer = TicketTierSerializer(tier, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Organizer public profile ──────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def organizer_profile(request, organizer_id):
    from accounts.models import User
    from accounts.serializers import OrganizerPublicSerializer
    import datetime

    try:
        organizer = User.objects.get(id=organizer_id, role="organizer")
    except User.DoesNotExist:
        return Response({"detail": "Organizer not found."}, status=404)

    events   = Event.objects.filter(organizer=organizer, is_active=True).order_by("-date")
    today    = str(datetime.date.today())
    upcoming = [e for e in events if str(e.date) >= today]
    past     = [e for e in events if str(e.date) <  today]

    total_bookings = sum(e.booked for e in events)
    total_capacity = sum(e.capacity for e in events)
    avg_fill_rate  = round((total_bookings / total_capacity * 100) if total_capacity else 0)

    def ev_data(e):
        return {
            "id": e.id, "title": e.title, "type": e.type,
            "date": str(e.date), "time": str(e.time),
            "venue": e.venue, "price": float(e.price),
            "capacity": e.capacity, "booked": e.booked,
            "fill_rate": round((e.booked / e.capacity * 100) if e.capacity else 0),
            "is_featured": e.is_featured,
        }

    return Response({
        "organizer": OrganizerPublicSerializer(organizer).data,
        "stats": {
            "total_events":   events.count(),
            "total_bookings": total_bookings,
            "avg_fill_rate":  avg_fill_rate,
            "upcoming_count": len(upcoming),
            "past_count":     len(past),
        },
        "upcoming_events": [ev_data(e) for e in upcoming[:6]],
        "past_events":     [ev_data(e) for e in past[:6]],
    })


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_org_profile(request):
    user = request.user
    for field in ["org_name", "org_description", "org_website", "org_logo"]:
        if field in request.data:
            setattr(user, field, request.data[field])
    user.save()
    from accounts.serializers import UserSerializer
    return Response(UserSerializer(user).data)
