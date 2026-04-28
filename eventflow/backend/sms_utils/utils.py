import requests
import environ
import os
from pathlib import Path



BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
env_file = os.path.join(BASE_DIR, ".env")

if os.path.exists(env_file):
    environ.Env.read_env(env_file)


def normalize_phone(phone):
    """Convert 07XXXXXXXX to 2547XXXXXXXX for Mobitech."""
    phone = str(phone).strip().replace(" ", "").replace("-", "").replace("+", "")
    if phone.startswith("0"):    return "254" + phone[1:]
    if phone.startswith("7"):    return "254" + phone
    if phone.startswith("254"):  return phone
    return "254" + phone

def send_sms(to_number, message):
    """Send SMS via Mobitech Bulk SMS API."""
    try:
        api_key   = env("MOBITECH_API_KEY")
       
        sender_id = env("MOBITECH_SENDER_ID", default="23107")

      
        api_url = "https://bulk.mobitechtechnologies.com/index.php/rest/index"

        payload = {
            "api_key":   api_key,
            "username":  env("MOBITECH_USERNAME", default=""), 
            "sender_id": sender_id,
            "mobile":    normalize_phone(to_number),
            "message":   message,
        }

       
        response = requests.post(api_url, data=payload, timeout=30)

       
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")

        if response.status_code == 200:
            
            if "success" in response.text.lower() or '"code":"0"' in response.text:
                print(f"SMS sent successfully to {to_number}")
                return True
            else:
                print(f"SMS failed rejection: {response.text}")
                return False
        else:
            print(f"HTTP Error: {response.status_code}")
            return False

    except Exception as e:
        print(f"SMS error: {e}")
        return False


def send_booking_confirmation_sms(phone, booking_code, event_title, event_date):
    message = f"EVENTFLOW: Booking confirmed for {event_title} on {event_date}. Code: {booking_code}."
    return send_sms(phone, message)

def send_event_reminder_sms(phone, event_title, event_date, event_time):
    message = f"EVENTFLOW REMINDER: {event_title} is TOMORROW on {event_date} at {event_time}."
    return send_sms(phone, message)

if __name__ == "__main__":
   
    result = send_sms("0701364957", "EVENTFLOW: Manual script test.")
    print("Final Result:", result)