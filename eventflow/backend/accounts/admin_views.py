from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from events.models import Event
from events.serializers import EventSerializer
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from sms_utils.models import SMSLog
from sms_utils.serializers import SMSLogSerializer
from .models import User
from .serializers import UserSerializer


def is_admin(user):
    return user.is_superuser or user.role == "admin"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_events(request):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    events = Event.objects.all().order_by("-date")
    return Response(EventSerializer(events, many=True).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_event_detail(request, pk):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    try:
        event = Event.objects.get(pk=pk)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Event.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    users = User.objects.filter(is_superuser=False).order_by("-date_joined")
    return Response(UserSerializer(users, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_toggle_user(request, pk):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    try:
        user = User.objects.get(pk=pk)
        user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_bookings(request):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    bookings = Booking.objects.all().order_by("-created_at")
    return Response(BookingSerializer(bookings, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_sms_logs(request):
    if not is_admin(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    logs = SMSLog.objects.all().order_by("-sent_at")[:100]
    return Response(SMSLogSerializer(logs, many=True).data)
