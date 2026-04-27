import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import MpesaTransaction
from .utils import stk_push, query_stk

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_stk_push(request):
    """Single STK push — kept for direct use."""
    phone       = request.data.get("phone", "").strip()
    amount      = request.data.get("amount")
    description = request.data.get("description", "EventFlow Payment")

    if not phone or not amount:
        return Response({"error": "phone and amount are required."}, status=400)
    try:
        amount = int(float(amount))
        if amount < 1: raise ValueError()
    except (ValueError, TypeError):
        return Response({"error": "Invalid amount."}, status=400)

    try:
        daraja_response = stk_push(
            phone=phone, amount=amount,
            account_reference=f"EF{request.user.id}",
            transaction_desc=description,
        )
    except Exception as e:
        logger.error(f"STK push error: {e}")
        return Response({"error": f"M-Pesa request failed: {str(e)}"}, status=502)

    if daraja_response.get("ResponseCode") == "0":
        txn = MpesaTransaction.objects.create(
            phone=phone, amount=amount,
            account_reference=f"EF{request.user.id}",
            transaction_desc=description,
            merchant_request_id=daraja_response.get("MerchantRequestID", ""),
            checkout_request_id=daraja_response.get("CheckoutRequestID", ""),
            status="pending",
        )
        return Response({
            "message": "STK push sent.",
            "checkout_request_id": txn.checkout_request_id,
        })
    return Response({"error": daraja_response.get("ResponseDescription", "STK push failed.")}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_stk_push(request):
    """
    Send M-Pesa STK Push to ALL confirmed attendees of a given event.
    Body: { event_id }
    The amount is taken from the event's ticket price.
    """
    from events.models import Event
    from bookings.models import Booking

    event_id = request.data.get("event_id")
    if not event_id:
        return Response({"error": "event_id is required."}, status=400)

    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response({"error": "Event not found or not yours."}, status=404)

    if event.price <= 0:
        return Response({"error": "This is a free event — no payment needed."}, status=400)

    bookings = Booking.objects.filter(event=event, status="pending")
    if not bookings.exists():
        return Response({"message": "No pending bookings found for this event."})

    sent, failed = [], []
    for booking in bookings:
        try:
            amount = int(booking.tickets * event.price)
            daraja_response = stk_push(
                phone=booking.attendee_phone,
                amount=amount,
                account_reference=f"EF{booking.id}"[:12],
                transaction_desc=f"{event.title}"[:13],
            )
            if daraja_response.get("ResponseCode") == "0":
                MpesaTransaction.objects.create(
                    phone=booking.attendee_phone,
                    amount=amount,
                    account_reference=f"EF{booking.id}",
                    transaction_desc=event.title[:13],
                    merchant_request_id=daraja_response.get("MerchantRequestID", ""),
                    checkout_request_id=daraja_response.get("CheckoutRequestID", ""),
                    status="pending",
                )
                sent.append(booking.attendee_phone)
            else:
                failed.append(booking.attendee_phone)
        except Exception as e:
            logger.error(f"Bulk STK error for {booking.attendee_phone}: {e}")
            failed.append(booking.attendee_phone)

    return Response({
        "message": f"STK push sent to {len(sent)} attendee(s).",
        "sent": sent,
        "failed": failed,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def query_payment(request):
    checkout_id = request.data.get("checkout_request_id", "").strip()
    if not checkout_id:
        return Response({"error": "checkout_request_id required."}, status=400)
    try:
        result = query_stk(checkout_id)
    except Exception as e:
        return Response({"error": str(e)}, status=502)
    result_code = result.get("ResultCode")
    try:
        txn = MpesaTransaction.objects.get(checkout_request_id=checkout_id)
        txn.status      = "success" if result_code == "0" else ("failed" if result_code else txn.status)
        txn.result_code = str(result_code or "")
        txn.result_desc = result.get("ResultDesc", "")
        txn.save()
    except MpesaTransaction.DoesNotExist:
        pass
    return Response({"result_code": result_code, "result_desc": result.get("ResultDesc", ""), "paid": result_code == "0"})


@api_view(["POST"])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """Safaricom calls this automatically after payment."""
    try:
        stk_callback        = request.data.get("Body", {}).get("stkCallback", {})
        checkout_request_id = stk_callback.get("CheckoutRequestID", "")
        result_code         = stk_callback.get("ResultCode")
        result_desc         = stk_callback.get("ResultDesc", "")

        try:
            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_request_id)
        except MpesaTransaction.DoesNotExist:
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        if result_code == 0:
            items = {i["Name"]: i.get("Value") for i in stk_callback.get("CallbackMetadata", {}).get("Item", [])}
            txn.status               = "success"
            txn.mpesa_receipt_number = str(items.get("MpesaReceiptNumber", ""))
            txn.transaction_date     = str(items.get("TransactionDate", ""))
            txn.result_code          = str(result_code)
            txn.result_desc          = result_desc
            txn.save()

            # Confirm related booking and send SMS
            try:
                from bookings.models import Booking
                booking = Booking.objects.filter(
                    attendee_phone__endswith=txn.phone[-9:], status="pending"
                ).order_by("-created_at").first()
                if booking:
                    booking.status     = "confirmed"
                    booking.mpesa_code = txn.mpesa_receipt_number
                    booking.save()
                    try:
                        from sms_utils.utils import send_booking_confirmation_sms
                        send_booking_confirmation_sms(
                            phone=booking.attendee_phone,
                            booking_code=booking.booking_code,
                            event_title=booking.event.title,
                            event_date=str(booking.event.date),
                        )
                    except Exception as sms_err:
                        logger.warning(f"SMS failed: {sms_err}")
            except Exception as be:
                logger.warning(f"Booking update failed: {be}")
        else:
            txn.status      = "cancelled" if result_code == 1032 else "failed"
            txn.result_code = str(result_code)
            txn.result_desc = result_desc
            txn.save()

    except Exception as e:
        logger.error(f"Callback error: {e}")

    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transaction_list(request):
    txns = MpesaTransaction.objects.all()[:50]
    return Response([{
        "id": t.id, "phone": t.phone, "amount": str(t.amount),
        "status": t.status, "receipt": t.mpesa_receipt_number,
        "date": t.created_at.strftime("%Y-%m-%d %H:%M"),
    } for t in txns])
