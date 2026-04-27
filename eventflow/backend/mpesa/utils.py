import requests
import base64
import environ
from datetime import datetime

env = environ.Env()

MPESA_AUTH_URL  = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
MPESA_STK_URL   = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
MPESA_QUERY_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"

def get_mpesa_token():
    consumer_key    = env("consumer_key")
    consumer_secret = env("consumer_secret")
    credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
    response = requests.get(MPESA_AUTH_URL, headers={"Authorization": f"Basic {credentials}"}, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]

def generate_password(shortcode, passkey, timestamp):
    return base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

def normalize_phone(phone):
    phone = str(phone).strip().replace(" ", "").replace("-", "")
    if phone.startswith("+254"): return phone[1:]
    if phone.startswith("0"):    return "254" + phone[1:]
    if phone.startswith("254"):  return phone
    return "254" + phone

def stk_push(phone, amount, account_reference, transaction_desc):
    shortcode    = env("MPESA_SHORTCODE")
    passkey      = env("MPESA_PASSKEY")
    callback_url = env("MPESA_CALLBACK_URL")
    token        = get_mpesa_token()
    timestamp    = datetime.now().strftime("%Y%m%d%H%M%S")
    password     = generate_password(shortcode, passkey, timestamp)
    payload = {
        "BusinessShortCode": shortcode,
        "Password":          password,
        "Timestamp":         timestamp,
        "TransactionType":   "CustomerPayBillOnline",
        "Amount":            int(amount),
        "PartyA":            normalize_phone(phone),
        "PartyB":            shortcode,
        "PhoneNumber":       normalize_phone(phone),
        "CallBackURL":       callback_url,
        "AccountReference":  account_reference[:12],
        "TransactionDesc":   transaction_desc[:13],
    }
    response = requests.post(MPESA_STK_URL, json=payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=30)
    response.raise_for_status()
    return response.json()

def query_stk(checkout_request_id):
    shortcode = env("MPESA_SHORTCODE")
    passkey   = env("MPESA_PASSKEY")
    token     = get_mpesa_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password  = generate_password(shortcode, passkey, timestamp)
    payload = {"BusinessShortCode": shortcode, "Password": password, "Timestamp": timestamp, "CheckoutRequestID": checkout_request_id}
    response = requests.post(MPESA_QUERY_URL, json=payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=30)
    response.raise_for_status()
    return response.json()
