
import base64
import requests
from datetime import datetime
from django.conf import settings


def get_mpesa_access_token():
    """
    Get OAuth access token from Safaricom.
    Token expires every 1 hour.
    """
    url = f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    response = requests.get(
        url,
        auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def generate_password():
    """
    Generate the password for STK Push request.
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def initiate_stk_push(phone_number, amount, account_reference, description):
    """
    Initiate STK Push payment request.

    Args:
        phone_number: Customer's phone in format 2547XXXXXXXX (no +)
        amount: Amount in KES (integer)
        account_reference: Your booking/order reference
        description: Short description shown to user

    Returns:
        dict with CheckoutRequestID if successful
    """
    # Normalize phone number to 2547XXXXXXXX format
    phone = phone_number.strip().replace("+", "").replace(" ", "")
    if phone.startswith("07") or phone.startswith("01"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone

    token = get_mpesa_access_token()
    password, timestamp = generate_password()

    url = f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",  # Use "CustomerBuyGoodsOnline" for till
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": description,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)
    return response.json()


def verify_mpesa_code(mpesa_code, phone_number, amount):
    """
    Verify an M-Pesa transaction code via the Transaction Status API.

    Args:
        mpesa_code: The M-Pesa receipt/code user entered (e.g. QKL4XY8Z99)
        phone_number: Payer's phone number
        amount: Expected amount

    Returns:
        True if verified, False otherwise
    """
    # NOTE: Full verification requires Transaction Status API (Daraja)
    # For now we do a basic format check + log for manual review
    # Replace this with actual Daraja Transaction Status API call when going live

    if not mpesa_code or len(mpesa_code) < 8:
        return False

    # In production, call Daraja Transaction Status API:
    # POST https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query
    # with the mpesa_code as TransactionID

    # Sandbox: accept any well-formed code for testing
    if settings.MPESA_ENVIRONMENT == "sandbox":
        return True

    return True  # Replace with actual API call in production


def handle_mpesa_callback(data):
    """
    Process the M-Pesa callback from Safaricom.
    Called when Safaricom posts payment result to MPESA_CALLBACK_URL.

    Expected data structure from Safaricom:
    {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "...",
                "CheckoutRequestID": "...",
                "ResultCode": 0,  # 0 = success
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 2500},
                        {"Name": "MpesaReceiptNumber", "Value": "QKL4XY8Z99"},
                        {"Name": "PhoneNumber", "Value": 254712345678},
                        ...
                    ]
                }
            }
        }
    }
    """
    from bookings.models import Booking
    from sms_utils.utils import send_booking_confirmation_sms

    callback = data.get("Body", {}).get("stkCallback", {})
    result_code = callback.get("ResultCode")

    if result_code != 0:
        # Payment failed or cancelled
        return {"success": False, "message": callback.get("ResultDesc")}

    # Extract payment details
    items = callback.get("CallbackMetadata", {}).get("Item", [])
    metadata = {item["Name"]: item.get("Value") for item in items}

    mpesa_receipt = metadata.get("MpesaReceiptNumber", "")
    amount = metadata.get("Amount", 0)
    phone = str(metadata.get("PhoneNumber", ""))

    # Find the pending booking for this phone
    try:
        booking = Booking.objects.filter(
            attendee_phone__contains=phone[-9:],  # match last 9 digits
            status="pending",
        ).latest("created_at")

        booking.mpesa_receipt = mpesa_receipt
        booking.mpesa_verified = True
        booking.status = "confirmed"
        booking.save()

        # Send confirmation SMS
        send_booking_confirmation_sms(booking)

        return {"success": True, "booking_id": booking.id}
    except Booking.DoesNotExist:
        return {"success": False, "message": "No matching booking found"}

# utils.py or a helpers file — add this function
import random
import string

def generate_booking_code():
    """Generate a unique 8-character alphanumeric booking code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))