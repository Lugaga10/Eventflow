# EventFlow — Complete Setup Guide
# Run this entire project locally in VS Code

===========================================================================
 FOLDER STRUCTURE (what you should have after copying files)
===========================================================================

eventflow/
├── .gitignore
├── frontend/                        ← React app (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   └── AuthModal.jsx
│       └── pages/
│           ├── PublicSite.jsx
│           ├── OrganizerPortal.jsx
│           └── AdminPortal.jsx
│
└── backend/                         ← Django REST API
    ├── manage.py
    ├── requirements.txt
    ├── .env.example                 ← copy this to .env and fill values
    ├── eventflow/
    │   ├── __init__.py
    │   ├── settings.py
    │   ├── urls.py
    │   ├── wsgi.py
    │   └── celery.py
    ├── accounts/                    ← User auth (register/login/admin)
    │   ├── __init__.py
    │   ├── apps.py
    │   ├── admin.py
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── admin_urls.py
    │   └── admin_views.py
    ├── events/                      ← Event CRUD
    │   ├── __init__.py
    │   ├── apps.py
    │   ├── admin.py
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   └── urls.py
    ├── bookings/                    ← Bookings + M-Pesa
    │   ├── __init__.py
    │   ├── apps.py
    │   ├── admin.py
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── mpesa.py                 ← M-Pesa STK Push logic
    │   └── mpesa_urls.py
    └── sms_utils/                   ← Africa's Talking SMS
        ├── __init__.py
        ├── apps.py
        ├── admin.py
        ├── models.py
        ├── serializers.py
        ├── utils.py                 ← SMS sending functions
        ├── tasks.py                 ← Celery scheduled tasks
        └── management/
            ├── __init__.py
            └── commands/
                ├── __init__.py
                ├── send_reminders.py
                ├── send_day_reminders.py
                └── cleanup_events.py


===========================================================================
 STEP 1 — PREREQUISITES
===========================================================================

Install these before anything else:

  1. Python 3.10+        → https://www.python.org/downloads/
  2. Node.js 18+         → https://nodejs.org/
  3. PostgreSQL 15+      → https://www.postgresql.org/download/
  4. VS Code             → https://code.visualstudio.com/
  5. Git                 → https://git-scm.com/

Recommended VS Code extensions:
  - Python (Microsoft)
  - ESLint
  - Prettier
  - Thunder Client (for testing API)


===========================================================================
 STEP 2 — SET UP POSTGRESQL DATABASE
===========================================================================

Open a terminal and run:

  # On Windows (open Command Prompt as Admin or use pgAdmin)
  psql -U postgres

  # On Mac/Linux
  sudo -u postgres psql

Then inside psql:

  CREATE DATABASE eventflow_db;
  CREATE USER eventflow_user WITH PASSWORD 'your_password_here';
  GRANT ALL PRIVILEGES ON DATABASE eventflow_db TO eventflow_user;
  \q

Remember the database name, username, and password — you'll need them in Step 4.


===========================================================================
 STEP 3 — BACKEND SETUP (Django)
===========================================================================

Open a terminal in VS Code (Terminal → New Terminal):

  # Navigate into the backend folder
  cd eventflow/backend

  # Create a Python virtual environment
  python -m venv venv

  # Activate it:
  # Windows:
  venv\Scripts\activate
  # Mac/Linux:
  source venv/bin/activate

  # You should see (venv) in your prompt. Now install dependencies:
  pip install -r requirements.txt

  # If psycopg2-binary fails on Windows, try:
  pip install psycopg2


===========================================================================
 STEP 4 — CONFIGURE ENVIRONMENT VARIABLES
===========================================================================

  # Copy the example env file
  cp .env.example .env

  # Open .env in VS Code and fill in your values:
  code .env

Minimum required values to fill in right now:
  DB_NAME=eventflow_db
  DB_USER=postgres          (or eventflow_user if you created one)
  DB_PASSWORD=your_password_here
  DJANGO_SECRET_KEY=        (generate one: python -c "import secrets; print(secrets.token_hex(32))")

For M-Pesa and SMS — you can leave sandbox values for now and add real keys later.
The app works in demo/offline mode even without these filled in.


===========================================================================
 STEP 5 — RUN DATABASE MIGRATIONS
===========================================================================

Still inside backend/ with venv active:

  python manage.py makemigrations accounts
  python manage.py makemigrations events
  python manage.py makemigrations bookings
  python manage.py makemigrations sms_utils
  python manage.py migrate

  # Create your superuser (this becomes the admin account)
  python manage.py createsuperuser
  # Enter: username, email, password
  # Example: username=admin, password=admin123


===========================================================================
 STEP 6 — START THE DJANGO SERVER
===========================================================================

  python manage.py runserver

  You should see:
    Starting development server at http://127.0.0.1:8000/
    Quit the server with CTRL-BREAK.

  Keep this terminal open. The API is now running.


===========================================================================
 STEP 7 — FRONTEND SETUP (React)
===========================================================================

Open a NEW terminal in VS Code:

  cd eventflow/frontend
  npm install
  npm run dev

  You should see:
    VITE v4.x.x  ready in XXX ms
    ➜  Local:   http://localhost:3000/

  Open your browser to http://localhost:3000


===========================================================================
 STEP 8 — ACCESS THE PORTALS
===========================================================================

PUBLIC SITE (anyone can visit):
  http://localhost:3000
  → Browse events, search, book, pay via M-Pesa

ORGANIZER SIGNUP/LOGIN:
  http://localhost:3000
  → Click "Get Started" or "Sign In"
  → Organizers manage their own events from the dashboard

ADMIN PORTAL (hidden — not linked anywhere on the public site):
  http://localhost:3000/#/admin-portal-secure
  → Login with your superuser credentials (created in Step 5)
  → Manage all events, users, bookings, SMS logs


===========================================================================
 STEP 9 — M-PESA SETUP (Safaricom Daraja)
===========================================================================

FOR SANDBOX TESTING (free, no real money):
  1. Go to https://developer.safaricom.co.ke
  2. Create an account and verify your email
  3. Click "My Apps" → "Add a New App"
  4. App Name: EventFlow, select "Lipa Na M-Pesa Online (MPesa Express)"
  5. Click your app → copy Consumer Key and Consumer Secret
  6. Go to APIs → Lipa Na M-Pesa Online → Get Passkey (sandbox)
  7. Update your .env:
       MPESA_CONSUMER_KEY=your_consumer_key
       MPESA_CONSUMER_SECRET=your_consumer_secret
       MPESA_SHORTCODE=174379          ← sandbox shortcode
       MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
       MPESA_ENVIRONMENT=sandbox

FOR CALLBACK URL (needed for STK Push):
  Install ngrok: https://ngrok.com/download
  Run: ngrok http 8000
  Copy the https URL (e.g. https://abc123.ngrok.io)
  Update .env:
    MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/mpesa/callback/

FOR PRODUCTION:
  - Change MPESA_ENVIRONMENT=production
  - Use your real Paybill/Till number as MPESA_SHORTCODE
  - Get your live Passkey from the Daraja portal
  - Deploy to a real server with a domain (not ngrok)
  - Update MPESA_CALLBACK_URL to your actual domain


===========================================================================
 STEP 10 — SMS SETUP (Africa's Talking)
===========================================================================

FOR SANDBOX TESTING (free, SMS goes to AT simulator):
  1. Go to https://africastalking.com → Sign Up
  2. Log in → go to Settings → API Key → Generate
  3. Update .env:
       AT_USERNAME=sandbox
       AT_API_KEY=your_api_key_here
       AT_ENVIRONMENT=sandbox
  4. To see sandbox SMS: go to AT dashboard → Sandbox → SMS Simulator

FOR PRODUCTION:
  1. Top up your AT account with credit
  2. Register Sender ID "EventFlow" (takes 1-3 days for approval)
  3. Update .env:
       AT_USERNAME=your_actual_username
       AT_API_KEY=your_production_api_key
       AT_SENDER_ID=EventFlow
       AT_ENVIRONMENT=production


===========================================================================
 STEP 11 — AUTOMATED SMS TASKS (Two Options)
===========================================================================

OPTION A — Simple Cron Jobs (Recommended for beginners)
  No extra setup needed. Just schedule these commands:

  On Linux/Mac (crontab -e):
    0 6 * * * cd /path/to/eventflow/backend && source venv/bin/activate && python manage.py send_day_reminders
    0 8 * * * cd /path/to/eventflow/backend && source venv/bin/activate && python manage.py send_reminders
    0 0 * * * cd /path/to/eventflow/backend && source venv/bin/activate && python manage.py cleanup_events

  On Windows (Task Scheduler):
    Create 3 tasks that run daily at 6am, 8am, and midnight
    Action: python C:\path\to\backend\manage.py send_day_reminders

OPTION B — Celery (More robust, for production)
  Install Redis: https://redis.io/download (or use Docker)
  
  # Terminal 1 — Redis
  redis-server

  # Terminal 2 — Celery worker
  cd backend
  source venv/bin/activate
  celery -A eventflow worker --loglevel=info

  # Terminal 3 — Celery Beat (scheduler)
  celery -A eventflow beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  Then run migrations for celery beat:
    python manage.py migrate django_celery_beat


===========================================================================
 QUICK REFERENCE — API ENDPOINTS
===========================================================================

AUTH:
  POST /api/auth/register/        → Sign up (organizer/attendee)
  POST /api/auth/login/           → Sign in
  POST /api/auth/admin-login/     → Admin sign in (separate endpoint)
  GET  /api/auth/me/              → Get current user (token required)
  GET  /api/auth/admin-me/        → Get current admin (token required)

EVENTS:
  GET  /api/events/public/        → All upcoming events (no auth)
  GET  /api/events/public/<id>/   → Single event (no auth)
  GET  /api/events/my/            → My events (organizer token)
  POST /api/events/create/        → Create event (organizer token)
  PUT  /api/events/<id>/          → Update my event (organizer token)
  DEL  /api/events/<id>/          → Delete my event (organizer token)

BOOKINGS:
  POST /api/bookings/create/      → Book an event (no auth needed)
  POST /api/bookings/stk-push/    → Initiate M-Pesa STK push
  POST /api/mpesa/callback/       → Safaricom posts here after payment
  GET  /api/bookings/my-events/   → Bookings for my events (organizer)
  GET  /api/bookings/my/          → My bookings as attendee

ADMIN (requires superuser token):
  GET  /api/admin/events/         → All events
  DEL  /api/admin/events/<id>/    → Delete any event
  GET  /api/admin/users/          → All users
  POST /api/admin/users/<id>/toggle/ → Enable/disable user
  GET  /api/admin/bookings/       → All bookings
  GET  /api/admin/sms-logs/       → SMS activity log


===========================================================================
 TROUBLESHOOTING
===========================================================================

"ModuleNotFoundError: No module named 'dotenv'"
  → pip install python-dotenv

"could not connect to server: Connection refused (PostgreSQL)"
  → Make sure PostgreSQL service is running
  → Windows: search "Services" → start "postgresql-x64-15"
  → Mac: brew services start postgresql@15

"CORS error in browser"
  → Make sure Django is running on port 8000 and frontend on 3000
  → Check CORS_ALLOWED_ORIGINS in settings.py

"Invalid admin credentials"
  → Make sure you ran: python manage.py createsuperuser
  → Try logging into /django-admin/ first to verify credentials

"SMS not sending"
  → Check AT_USERNAME and AT_API_KEY in .env
  → For sandbox: check the AT SMS Simulator at africastalking.com dashboard

"M-Pesa callback not working locally"
  → You need ngrok running: ngrok http 8000
  → Copy the https URL into MPESA_CALLBACK_URL in .env
  → Restart Django after changing .env

django_celery_beat migration error:
  → If you don't want Celery, remove 'django_celery_beat' from INSTALLED_APPS
    in settings.py — use cron jobs (Option A above) instead
