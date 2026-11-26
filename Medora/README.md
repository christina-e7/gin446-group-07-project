# Medora — clinic management demo

Medora is a university web programming project built using **Flask, SQLite, Jinja HTML, CSS and vanilla JavaScript**. It uses a single Flask server, a small relational database and the browser Fetch API. No frontend framework is needed.

> **University demonstration with fictional accounts only.** Do not store actual patient information.

## Main workflow (same as our presentation)

1. **Patient** registers, finds a doctor and books a free time slot.
2. **Assistant** confirms the booking and changes its status to **Waiting** when the patient arrives.
3. **Doctor** sees only their own schedule, starts a consultation, then marks it **Completed**.
4. **Administrator** views clinic-wide appointments, manages staff and doctor availability.
5. The dashboards refresh every eight seconds through `GET /api/appointments`.

The app includes appointment history, filtering, rescheduling (Booked or Confirmed appointments), cancellation confirmation, and password changes. The Gemini assistant **only extracts scheduling preferences**; it never diagnoses patients or automatically books an appointment.

## Running locally (Mac)

From the `Medora` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DEMO_MODE=1
export DEMO_PASSWORD='ChooseAStrongDemoPassword123!'
export SECRET_KEY='choose-a-long-random-secret'
python app.py
```

Open http://127.0.0.1:5000.

## Demo accounts

| Role | Email |
| --- | --- |
| Patient | patient@medora.test |
| Cardiology — Dr. Sarah Haddad | cardio@medora.test |
| Ophthalmology — Dr. Adam Khoury | eye@medora.test |
| General Medicine — Dr. Lina Saad | general@medora.test |
| Reception / Assistant | assistant@medora.test |
| Clinic Admin | admin@medora.test |

All demo accounts are seeded with the `DEMO_PASSWORD` environment variable. Existing passwords are not reset by restarting the server.

## AI configuration

Optional: set `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. The app asks Gemini to extract a specialty, date, and morning/afternoon preference from a short request. The **server** checks real available appointment slots. Without the API key, manual booking still works. Never send clinical details into the AI prompt.

## Main files to explain to your professor

- `app.py`: Flask routes, login, appointment status rules, validation and database operations.
- `templates/dashboard.html`: HTML page for the four role dashboards.
- `static/app.js`: Fetch requests, time-slot buttons, table filters and eight-second refresh.
- `static/style.css`: Responsive page styling.
- `tests/test_app.py`: Basic automated scenarios.

Database relationships: users → slots (doctor), users → appointments (patient), slots → appointments. A unique SQLite index prevents more than one non-cancelled booking for the same slot. Passwords are hashed; role and ownership permissions are enforced server-side; state-changing requests use CSRF tokens.

## Deployment notes (Render)

The app is deployed on Render from the university repository. Set **Root Directory** blank, **Build Command** `pip install -r Medora/requirements.txt`, and **Start Command** `cd Medora && gunicorn app:app`.

Environment variables include `SECRET_KEY`, `DEMO_MODE`, `DEMO_PASSWORD`, `COOKIE_SECURE=1`, and optionally `GEMINI_API_KEY`. Set `DATABASE_PATH` to a persistent disk path when a persistent disk is available.

**Important:** Render free instances use ephemeral storage. Local SQLite files can disappear after restart/redeploy; this is not suitable for durable production appointment records. For real deployments use a persistent database, e.g. PostgreSQL, and a security review. Keep `DEMO_MODE` disabled and do not expose demo credentials in any real clinical deployment.

## Tests

```bash
cd Medora
python -m pytest -v
```

The tests use a temporary database. The project includes demo authentication, scheduling, status transitions and role authorization. Review and understand every component before a presentation; follow your instructor's rules about AI-assisted coding and attribution.
