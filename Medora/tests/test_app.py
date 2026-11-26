import pytest
from app import app, init

TEST_PASSWORD = 'LocalTestOnly123!'

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('DEMO_MODE', '1')
    monkeypatch.setenv('DEMO_PASSWORD', TEST_PASSWORD)
    app.config.update(TESTING=True, DATABASE=str(tmp_path/'test.db'))
    with app.app_context():
        init()
    return app.test_client()

def login(c, email):
    c.get('/login')
    with c.session_transaction() as s:
        token = s['csrf']
    return c.post('/login', data={
        'csrf': token,
        'email': email,
        'password': TEST_PASSWORD
    }, follow_redirects=True)

def test_roles(client):
    assert login(client, 'patient@medora.test').status_code == 200
    with client.session_transaction() as s:
        token = s['csrf']
    assert client.post('/staff', data={'csrf': token}).status_code == 403
    assert client.post('/book', data={}).status_code == 400

def test_booking(client):
    login(client, 'patient@medora.test')
    from app import db
    with app.app_context():
        doctor = db().execute(
            "SELECT id FROM users WHERE email='cardio@medora.test'"
        ).fetchone()[0]
    slot = client.get('/api/slots?doctor='+str(doctor)).json[0]['id']
    with client.session_transaction() as s:
        token = s['csrf']
    for _ in range(2):
        client.post('/book', data={'csrf': token, 'slot': slot})
    assert len(client.get('/api/appointments').json) == 1
def csrf(client):
    client.get('/dashboard')
    with client.session_transaction() as session:
        return session['csrf']

def test_patient_cannot_edit_other_patient(client):
    from app import db
    login(client, 'patient@medora.test')
    token = csrf(client)
    with app.app_context():
        doctor = db().execute("SELECT id FROM users WHERE email='cardio@medora.test'").fetchone()[0]
    slot = client.get('/api/slots?doctor=' + str(doctor)).json[0]['id']
    client.post('/book', data={'csrf': token, 'slot': slot})
    appointment = client.get('/api/appointments').json[0]['id']
    client.post('/logout', data={'csrf': token})
    # Register a second patient who must not change the first patient's booking.
    client.get('/register')
    with client.session_transaction() as session:
        token = session['csrf']
    client.post('/register', data={'csrf': token, 'name': 'Second Patient',
                'email': 'second@example.test', 'password': 'SecondPatientPass123!'})
    token = csrf(client)
    assert client.post('/appointment/' + str(appointment) + '/status',
                       data={'csrf': token, 'status': 'Cancelled'}).status_code == 403
    assert client.post('/appointment/' + str(appointment) + '/reschedule',
                       data={'csrf': token, 'slot': slot}).status_code == 403

def test_rescheduling_preserves_appointment(client):
    from app import db
    login(client, 'patient@medora.test')
    token = csrf(client)
    with app.app_context():
        doctor = db().execute("SELECT id FROM users WHERE email='cardio@medora.test'").fetchone()[0]
    slots = client.get('/api/slots?doctor=' + str(doctor)).json
    first, second = slots[0]['id'], slots[1]['id']
    client.post('/book', data={'csrf': token, 'slot': first})
    before = client.get('/api/appointments').json
    appointment_id = before[0]['id']
    response = client.post('/appointment/' + str(appointment_id) + '/reschedule',
                           data={'csrf': token, 'slot': second})
    assert response.status_code == 302
    after = client.get('/api/appointments').json
    assert len(after) == 1
    assert after[0]['id'] == appointment_id
    assert after[0]['status'] == 'Booked'
    assert second not in [s['id'] for s in client.get('/api/slots?doctor=' + str(doctor)).json]
    assert first in [s['id'] for s in client.get('/api/slots?doctor=' + str(doctor)).json]

def test_password_change(client):
    login(client, 'patient@medora.test')
    token = csrf(client)
    assert client.post('/account/password',data={'csrf':token,'current_password':'wrong',
        'new_password':'NewPassword123!'}).status_code == 302
    assert client.post('/account/password',data={'csrf':token,'current_password':TEST_PASSWORD,
        'new_password':'NewPassword123!'}).status_code == 302
    client.post('/logout', data={'csrf':token})
    # The old demo password should no longer sign in after updating.
    response=login(client,'patient@medora.test')
    assert b'Invalid email or password' in response.data
    client.get('/login')
    with client.session_transaction() as session:
        token=session['csrf']
    response=client.post('/login',data={'csrf':token,'email':'patient@medora.test',
        'password':'NewPassword123!'},follow_redirects=True)
    assert b'patient' in response.data.lower()

def test_demo_email_migration(client):
    from app import db, init
    with app.app_context():
        doctor = db().execute("SELECT id FROM users WHERE email='cardio@medora.test'").fetchone()[0]
        db().execute("UPDATE users SET email='doctor@medora.test' WHERE id=?", (doctor,))
        db().commit()
        init()
        changed = db().execute("SELECT id FROM users WHERE email='cardio@medora.test'").fetchone()
        assert changed[0] == doctor
        assert db().execute("SELECT 1 FROM users WHERE email='doctor@medora.test'").fetchone() is None


def test_public_pages_and_assets(client):
    assert b'Better care.' in client.get('/').data
    assert b'data-password="password"' in client.get('/login').data
    assert client.get('/static/clinic.svg').status_code == 200
    assert client.get('/static/favicon.svg').status_code == 200
    missing = client.get('/not-a-real-page')
    assert missing.status_code == 404
    assert b'Back to Medora' in missing.data

def test_booking_ui_elements(client):
    response = login(client, 'patient@medora.test')
    assert b'id="reschedule-dialog"' in response.data
    assert b'id="slot-date"' in response.data
    assert b'doctor-heart.svg' in response.data
