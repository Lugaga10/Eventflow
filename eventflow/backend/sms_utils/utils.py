import requests
import environ

env = environ.Env()


def normalize_phone(phone):
    """Convert 07XXXXXXXX to 2547XXXXXXXX for Mobitech."""
    phone = str(phone).strip().replace(" ", "").replace("-", "")
    if phone.startswith("+254"): return phone[1:]  # remove +
    if phone.startswith("0"):    return "254" + phone[1:]
    if phone.startswith("254"):  return phone
    return "254" + phone


def send_sms(to_number, message):
    """Send SMS via Mobitech Bulk SMS API."""
    try:
        api_key   = env("MOBITECH_API_KEY")
        sender_id = env("MOBITECH_SENDER_ID", default="EVENTFLOW")

        # Correct Mobitech API endpoint
        api_url = "https://bulk.mobitechtechnologies.com/index.php/rest/index"

        payload = {
            "api_key":   api_key,
            "mobile":    normalize_phone(to_number),
            "message":   message,
            "sender_id": sender_id,
        }

        response = requests.post(api_url, data=payload, timeout=30)

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            try:
                result = response.json()
                if result.get("status") == "success" or result.get("code") == "0":
                    print(f"SMS sent successfully to {to_number}")
                    return True
                else:
                    print(f"SMS failed: {result}")
                    return False
            except Exception:
                # Some success responses are plain text
                if "success" in response.text.lower():
                    return True
                return False
        else:
            print(f"SMS HTTP error: {response.status_code}")
            return False

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
        f"EVENTFLOW REMINDER: {event_title} is TOMORROW on {event_date} "
        f"at {event_time}. Don't forget to come prepared. See you there!"
    )
    return send_sms(phone, message)



if __name__ == "__main__":
    result = send_sms("0701364957", "EVENTFLOW: Test SMS from EventFlow. It works!")
    print("Result:", result)
