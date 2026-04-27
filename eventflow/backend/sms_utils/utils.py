import environ
from twilio.rest import Client

env = environ.Env()

def normalize_phone(phone):
    """Convert 07XXXXXXXX to +2547XXXXXXXX for Twilio."""
    phone = phone.strip()
    if phone.startswith('0'):
        return '+254' + phone[1:]
    if not phone.startswith('+'):
        return '+254' + phone
    return phone


def send_sms(to_number, message):
    """Send SMS via Twilio."""
    try:
        account_sid = env('account_sid')
        auth_token = env('auth_token')

        client = Client(account_sid, auth_token)

        msg = client.messages.create(
            body=message,
            from_="EventFlow",   # Alphanumeric sender ID
            to=normalize_phone(to_number),
        )
        print(f"SMS sent: {msg.sid}")
        return True
    except Exception as e:
        print(f"SMS error: {e}")
        return False


def send_booking_confirmation_sms(phone, booking_code, event_title, event_date):
    """Send booking confirmation SMS to attendee."""
    message = (
        f"EVENTFLOW: Booking confirmed for {event_title} on {event_date}. "
        f"Your booking code is {booking_code}. See you there!"
    )
    return send_sms(phone, message)


def send_event_reminder_sms(phone, event_title, event_date, event_time):
    """Send event reminder SMS to attendee."""
    message = (
        f"EVENTFLOW REMINDER: {event_title} is TOMORROW on {event_date} at {event_time}. "
        f"Don't forget to come prepared. See you there!"
    )
    return send_sms(phone, message)