# Medora — presentation walkthrough and code explanation

## What we demonstrate

Patient → Assistant → Doctor → Admin:

1. **Patient** signs in, selects Dr. Sarah Haddad, books an available slot.
2. **Assistant** sees the same appointment, confirms it, then marks it **Waiting**.
3. **Doctor** sees the patient in their own schedule, changes status to **In consultation** and then **Completed**.
4. **Admin** sees clinic-wide appointment totals and can add staff or availability.
5. Changes appear across dashboards via an API refresh every eight seconds.

The extra options are rescheduling, appointment filters, appointment history and changing a password. The core presentation remains the same.

## Why these technologies?

- **Flask:** Small Python framework that handles routes, access checks and database requests.
- **SQLite:** Simple relational database stored in a file, convenient for a university demo.
- **Jinja HTML:** Flask fills the page with doctor names, appointments and roles.
- **CSS:** Responsive layout without a design framework.
- **Vanilla JavaScript:** Uses the browser's `fetch()` function to refresh appointments and find open slots.
- **Gemini:** Extracts requested appointment preferences but never diagnoses or books automatically.

## Questions your professor may ask

**How do you avoid double booking?**
The database has a unique index for appointments with a non-cancelled status on the same slot. The server also checks for valid future slots.

**Can a patient edit someone else's appointment?**
No. The Flask route checks the logged-in user's role and verifies appointment ownership.

**What happens when a patient cancels?**
The appointment remains in the history with status **Cancelled**, but its slot becomes bookable again.

**How do the pages update without refreshing manually?**
JavaScript calls `GET /api/appointments` every eight seconds and redraws the appointment table and counters.

**What makes Gemini safe for this prototype?**
It only extracts scheduling preferences such as specialty, date or time period. The backend checks actual available slots. Users are told not to provide medical information.

**How does rescheduling work?**
The browser loads open time slots and sends the selected slot to `POST /appointment/<id>/reschedule`. Flask verifies ownership, status and availability before updating the existing appointment record.

**How are passwords protected?**
Werkzeug stores password hashes rather than plaintext. The change-password route checks the current password and hashes the new one.

**What is the database limitation?**
Render free instance disk is not durable. A production version should use a persistent database, such as PostgreSQL, and would require further security and privacy work.

## File map

| File | Purpose |
| --- | --- |
| `app.py` | Main Flask routes and SQLite queries |
| `templates/base.html` | Shared header, messages and layout |
| `templates/dashboard.html` | Role-based dashboard HTML |
| `static/app.js` | Appointment refresh, filters, availability, buttons |
| `static/style.css` | Styling and mobile layout |
| `tests/test_app.py` | Automated test scenarios |

Practice each step in a local browser and follow your instructor's rules on use and disclosure of AI assistance. Don't claim any feature is complete until you've verified it yourself.
