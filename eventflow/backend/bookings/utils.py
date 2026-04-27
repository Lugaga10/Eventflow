import random
import string
from .models import Booking


def generate_booking_code():
    """
    Generate a unique 8-character alphanumeric booking code.
    Retries until a unique one is found.
    """
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not Booking.objects.filter(booking_code=code).exists():
            return code