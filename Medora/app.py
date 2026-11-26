import os, secrets, sqlite3, datetime as dt, functools, json, urllib.request
from io import BytesIO
from PIL import Image, ImageOps, UnidentifiedImageError
from flask import Response, Flask, render_template, request, redirect, url_for, session, g, abort, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
app=Flask(__name__)
app.config.update(SECRET_KEY=os.environ.get('SECRET_KEY') or secrets.token_hex(32), DATABASE=os.environ.get('DATABASE_PATH','medora.db'), MAX_CONTENT_LENGTH=3*1024*1024, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', SESSION_COOKIE_SECURE=os.environ.get('COOKIE_SECURE')=='1')
def db():
    if 'db' not in g:
        g.db=sqlite3.connect(app.config['DATABASE']); g.db.row_factory=sqlite3.Row; g.db.execute('PRAGMA foreign_keys=ON')
    return g.db
@app.teardown_appcontext
def close(e):
    if 'db' in g: g.db.close()
def init():
    d=db(); d.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('patient','doctor','assistant','admin')),specialty TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS slots(id INTEGER PRIMARY KEY,doctor INTEGER REFERENCES users(id),start TEXT NOT NULL,UNIQUE(doctor,start));
    CREATE TABLE IF NOT EXISTS appointments(id INTEGER PRIMARY KEY,slot INTEGER REFERENCES slots(id),patient INTEGER REFERENCES users(id),status TEXT NOT NULL DEFAULT 'Booked',created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE UNIQUE INDEX IF NOT EXISTS one_booking ON appointments(slot) WHERE status!='Cancelled';'''); d.commit()
    if 'profile_picture' not in [column['name'] for column in d.execute('PRAGMA table_info(users)')]:
        d.execute('ALTER TABLE users ADD COLUMN profile_picture BLOB')
        d.commit()
    if os.environ.get('DEMO_MODE','0')=='1':
        d.execute(
            "UPDATE users SET email=? WHERE email=? "
            "AND role='doctor' AND specialty='Cardiology' "
            "AND NOT EXISTS (SELECT 1 FROM users WHERE email=?)",
            ('cardio@medora.test', 'doctor@medora.test', 'cardio@medora.test')
        )

        for name,email,role,specialty in [('Sarah Haddad','cardio@medora.test','doctor','Cardiology'),('Adam Khoury','eye@medora.test','doctor','Ophthalmology'),('Lina Saad','general@medora.test','doctor','General Medicine'),('Reception','assistant@medora.test','assistant',''),('Clinic Admin','admin@medora.test','admin',''),('Demo Patient','patient@medora.test','patient','')]:
            if not d.execute('SELECT 1 FROM users WHERE email=?',(email,)).fetchone(): d.execute('INSERT INTO users(name,email,password,role,specialty) VALUES(?,?,?,?,?)',(name,email,generate_password_hash(os.environ['DEMO_PASSWORD']),role,specialty))
        for u in d.execute("SELECT id FROM users WHERE role='doctor'").fetchall():
            for day in range(7):
                date=dt.date.today()+dt.timedelta(days=day)
                for hour in (9,10,11,14,15):
                    d.execute('INSERT OR IGNORE INTO slots(doctor,start) VALUES(?,?)',(u['id'],f'{date}T{hour:02}:00'))
        d.commit()
@app.before_request
def before():
    g.user=db().execute('SELECT id,name,email,password,role,specialty,profile_picture IS NOT NULL AS has_picture FROM users WHERE id=?',(session.get('uid'),)).fetchone()
    if 'csrf' not in session: session['csrf']=secrets.token_hex(24)
    if request.method=='POST' and not secrets.compare_digest(session['csrf'],request.form.get('csrf','') or request.headers.get('X-CSRF-Token','')): abort(400)
def roles(*allowed):
    def deco(fn):
        @functools.wraps(fn)
        def wrapped(*a,**k):
            if not g.user: return redirect(url_for('login'))
            if g.user['role'] not in allowed: abort(403)
            return fn(*a,**k)
        return wrapped
    return deco
@app.route('/')
def home(): return redirect(url_for('dashboard')) if g.user else render_template('home.html')
@app.route('/login',methods=['GET','POST'])
def login():
    if request.method=='POST':
        u=db().execute('SELECT * FROM users WHERE email=?',(request.form.get('email','').strip().lower(),)).fetchone()
        if u and check_password_hash(u['password'],request.form.get('password','')):
            session.clear(); session['uid']=u['id']; return redirect(url_for('dashboard'))
        flash('Invalid email or password.')
    return render_template('login.html',register=False)
@app.route('/register',methods=['GET','POST'])
def register():
    if request.method=='POST':
        name=request.form.get('name','').strip(); email=request.form.get('email','').strip().lower(); pw=request.form.get('password','')
        if not name or len(name)>100 or '@' not in email or len(email)>200 or not 10<=len(pw)<=128: flash('Enter a valid name, email and password (10–128 characters).')
        else:
            try:
                cur=db().execute('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',(name,email,generate_password_hash(pw),'patient')); db().commit(); session.clear(); session['uid']=cur.lastrowid; return redirect(url_for('dashboard'))
            except sqlite3.IntegrityError: flash('Email already registered.')
    return render_template('login.html',register=True)
@app.post('/logout')
def logout(): session.clear(); return redirect(url_for('home'))
def appointments():
    sql='SELECT a.id,a.status,s.start,d.name doctor,p.name patient, s.doctor doctor_id FROM appointments a JOIN slots s ON s.id=a.slot JOIN users d ON d.id=s.doctor JOIN users p ON p.id=a.patient'; role=g.user['role']; args=[]
    if role=='patient': sql+=' WHERE a.patient=?'; args=[g.user['id']]
    if role=='doctor': sql+=' WHERE s.doctor=?'; args=[g.user['id']]
    return [dict(r) for r in db().execute(sql+' ORDER BY s.start',args)]

def counts(rows, role):
    active=[a for a in rows if a['status'] not in ('Cancelled','Completed')]
    if role=='patient':
        return [('Upcoming',len([a for a in active if a['start']>=dt.datetime.now().isoformat(timespec='minutes')])),('Completed',len([a for a in rows if a['status']=='Completed'])),('Cancelled',len([a for a in rows if a['status']=='Cancelled']))]
    if role=='doctor':
        today=dt.date.today().isoformat()
        return [("Today's visits",len([a for a in active if a['start'].startswith(today)])),('Waiting',len([a for a in rows if a['status']=='Waiting'])),('Completed',len([a for a in rows if a['status']=='Completed']))]
    return [('Active appointments',len(active)),('Waiting room',len([a for a in rows if a['status']=='Waiting'])),('Completed',len([a for a in rows if a['status']=='Completed']))]

def valid_slot(slot):
    return db().execute('SELECT 1 FROM slots WHERE id=? AND start>=?',(slot,dt.datetime.now().isoformat(timespec='minutes'))).fetchone()

@app.get('/dashboard')
@roles('patient','doctor','assistant','admin')
def dashboard():
    doctors=db().execute("SELECT id,name,specialty,profile_picture IS NOT NULL AS has_picture FROM users WHERE role='doctor'").fetchall(); patients=db().execute("SELECT id,name FROM users WHERE role='patient'").fetchall() if g.user['role'] in ('assistant','admin') else []
    staff=db().execute('SELECT id,name,email,role,specialty,profile_picture IS NOT NULL AS has_picture FROM users ORDER BY role').fetchall() if g.user['role']=='admin' else []
    rows=appointments(); return render_template('dashboard.html',doctors=doctors,patients=patients,staff=staff,rows=rows,stats=counts(rows,g.user['role']))
@app.get('/api/appointments')
@roles('patient','doctor','assistant','admin')
def api_appointments(): return jsonify(appointments())
@app.get('/api/slots')
@roles('patient','assistant','admin')
def slots():
    return jsonify([dict(r) for r in db().execute("SELECT s.id,s.start,u.name,u.specialty FROM slots s JOIN users u ON u.id=s.doctor WHERE s.doctor=? AND s.start>=? AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.slot=s.id AND a.status!='Cancelled') ORDER BY s.start",(request.args.get('doctor',type=int),dt.datetime.now().isoformat(timespec='minutes')))])
@app.post('/book')
@roles('patient','assistant','admin')
def book():
    slot=request.form.get('slot',type=int); patient=g.user['id'] if g.user['role']=='patient' else request.form.get('patient',type=int)
    if not db().execute("SELECT 1 FROM users WHERE id=? AND role='patient'",(patient,)).fetchone() or not db().execute('SELECT 1 FROM slots WHERE id=? AND start>=?',(slot,dt.datetime.now().isoformat(timespec='minutes'))).fetchone(): abort(400)
    try: db().execute('INSERT INTO appointments(slot,patient) VALUES(?,?)',(slot,patient)); db().commit(); flash('Appointment booked.')
    except sqlite3.IntegrityError: flash('That slot is already booked. Choose another.')
    return redirect(url_for('dashboard'))

@app.post('/appointment/<int:id>/reschedule')
@roles('patient','assistant','admin')
def reschedule(id):
    appointment=db().execute('SELECT * FROM appointments WHERE id=?',(id,)).fetchone()
    if not appointment: abort(404)
    if g.user['role']=='patient' and appointment['patient']!=g.user['id']: abort(403)
    if appointment['status'] not in ('Booked','Confirmed'): abort(400)
    slot=request.form.get('slot',type=int)
    if not slot or not valid_slot(slot): abort(400)
    try:
        updated=db().execute("UPDATE appointments SET slot=?,status='Booked' WHERE id=? AND status IN ('Booked','Confirmed')",(slot,id))
        if not updated.rowcount: abort(409)
        db().commit(); flash('Appointment rescheduled.')
    except sqlite3.IntegrityError:
        db().rollback(); flash('That time is no longer available.')
    return redirect(url_for('dashboard'))

@app.get('/account/picture/<int:user_id>')
@roles('patient','doctor','assistant','admin')
def profile_picture(user_id):
    user=db().execute('SELECT role,profile_picture FROM users WHERE id=?',(user_id,)).fetchone()
    if not user or (user_id!=g.user['id'] and user['role']!='doctor' and g.user['role']!='admin'):
        abort(404)
    if not user['profile_picture']: abort(404)
    return Response(user['profile_picture'], mimetype='image/jpeg',
                    headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})

@app.post('/account/picture')
@roles('patient','doctor','assistant','admin')
def update_picture():
    picture=request.files.get('picture')
    if not picture:
        flash('Choose a picture first.')
        return redirect(url_for('dashboard',_anchor='account'))
    data=picture.stream.read(2*1024*1024+1)
    if len(data)>2*1024*1024:
        flash('Choose an image smaller than 2 MB.')
        return redirect(url_for('dashboard',_anchor='account'))
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in ('JPEG','PNG','WEBP') or image.width*image.height>16000000:
                raise ValueError()
            image=ImageOps.exif_transpose(image)
            image.thumbnail((512,512))
            output=BytesIO()
            image.convert('RGB').save(output,format='JPEG',quality=85)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        flash('Choose a valid JPG, PNG or WebP image (up to 16 megapixels).')
        return redirect(url_for('dashboard',_anchor='account'))
    db().execute('UPDATE users SET profile_picture=? WHERE id=?',(output.getvalue(),g.user['id']))
    db().commit()
    flash('Profile picture updated.')
    return redirect(url_for('dashboard',_anchor='account'))

@app.post('/account/picture/remove')
@roles('patient','doctor','assistant','admin')
def remove_picture():
    db().execute('UPDATE users SET profile_picture=NULL WHERE id=?',(g.user['id'],))
    db().commit()
    flash('Profile picture removed.')
    return redirect(url_for('dashboard',_anchor='account'))

@app.post('/account/password')
@roles('patient','doctor','assistant','admin')
def change_password():
    old=request.form.get('current_password','')
    new=request.form.get('new_password','')
    if not check_password_hash(g.user['password'],old):
        flash('Current password is incorrect.')
    elif not 10<=len(new)<=128:
        flash('New password must be 10–128 characters.')
    elif new==old:
        flash('Choose a different password.')
    else:
        db().execute('UPDATE users SET password=? WHERE id=?',(generate_password_hash(new),g.user['id']))
        db().commit()
        flash('Password updated successfully.')
    return redirect(url_for('dashboard'))

@app.post('/appointment/<int:id>/status')
@roles('patient','doctor','assistant','admin')
def status(id):
    a=db().execute('SELECT a.*,s.doctor FROM appointments a JOIN slots s ON s.id=a.slot WHERE a.id=?',(id,)).fetchone(); role=g.user['role']; new=request.form.get('status')
    if not a: abort(404)
    if role=='patient' and a['patient']!=g.user['id'] or role=='doctor' and a['doctor']!=g.user['id']: abort(403)
    allowed={'patient':{'Booked':['Cancelled'],'Confirmed':['Cancelled']},'assistant':{'Booked':['Confirmed','Cancelled'],'Confirmed':['Waiting','Cancelled']},'doctor':{'Waiting':['In consultation'],'In consultation':['Completed']},'admin':{'Booked':['Confirmed','Cancelled'],'Confirmed':['Waiting','Cancelled'],'Waiting':['In consultation'],'In consultation':['Completed']}}
    if new not in allowed[role].get(a['status'],[]): abort(400)
    db().execute('UPDATE appointments SET status=? WHERE id=? AND status=?',(new,id,a['status'])); db().commit(); return redirect(url_for('dashboard'))
@app.post('/availability')
@roles('doctor','assistant','admin')
def availability():
    doctor=g.user['id'] if g.user['role']=='doctor' else request.form.get('doctor',type=int)
    try: start=dt.datetime.fromisoformat(request.form['start']); assert start>dt.datetime.now() and start.minute in (0,30) and start.second==0
    except (ValueError,KeyError,AssertionError,TypeError): abort(400)
    if not db().execute("SELECT 1 FROM users WHERE id=? AND role='doctor'",(doctor,)).fetchone(): abort(400)
    db().execute('INSERT OR IGNORE INTO slots(doctor,start) VALUES(?,?)',(doctor,start.isoformat(timespec='minutes'))); db().commit(); flash('Availability saved.'); return redirect(url_for('dashboard'))
@app.post('/staff')
@roles('admin')
def staff():
    role=request.form.get('role'); name=request.form.get('name','').strip(); email=request.form.get('email','').strip().lower(); pw=request.form.get('password',''); specialty=request.form.get('specialty','').strip()
    if role not in ('doctor','assistant') or not name or '@' not in email or not 10<=len(pw)<=128 or (role=='doctor' and not specialty): abort(400)
    try: db().execute('INSERT INTO users(name,email,password,role,specialty) VALUES(?,?,?,?,?)',(name,email,generate_password_hash(pw),role,specialty)); db().commit(); flash('Staff account created.')
    except sqlite3.IntegrityError: flash('Email already exists.')
    return redirect(url_for('dashboard'))
@app.post('/api/smart')
@roles('patient','assistant','admin')
def smart():
    key=os.environ.get('GEMINI_API_KEY'); text=(request.get_json(silent=True) or {}).get('text','')
    if not isinstance(text,str) or not 1<=len(text)<=500: return jsonify(error='Enter a scheduling request (up to 500 characters).'),400
    if not key: return jsonify(error='Gemini is not configured. Use manual booking.'),503
    specialties=[r[0] for r in db().execute("SELECT DISTINCT specialty FROM users WHERE role='doctor'")]
    prompt=f'Extract only explicitly requested appointment scheduling preferences, never diagnose or infer a specialty from symptoms. Today is {dt.date.today()}. Allowed specialties: {specialties}. Return JSON with specialty (or null), date (YYYY-MM-DD or null), period (morning, afternoon or null). Request: {text}'
    try:
        req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/'+os.environ.get('GEMINI_MODEL','gemini-2.5-flash')+':generateContent',data=json.dumps({'contents':[{'parts':[{'text':prompt}]}],'generationConfig':{'responseMimeType':'application/json'}}).encode(),headers={'Content-Type':'application/json','x-goog-api-key':key}); result=json.loads(urllib.request.urlopen(req,timeout=15).read()); prefs=json.loads(result['candidates'][0]['content']['parts'][0]['text']); spec=prefs.get('specialty'); date=prefs.get('date'); period=prefs.get('period')
        if spec is not None and spec not in specialties or period not in (None,'morning','afternoon'): raise ValueError()
        if date is not None: dt.date.fromisoformat(date)
        matches=[dict(r) for r in db().execute("SELECT s.id,s.start,u.name,u.specialty FROM slots s JOIN users u ON u.id=s.doctor WHERE s.start>=? AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.slot=s.id AND a.status!='Cancelled') ORDER BY s.start",(dt.datetime.now().isoformat(timespec='minutes'),)) if (not spec or r['specialty']==spec) and (not date or r['start'].startswith(date)) and (not period or (int(r['start'][11:13])<12)==(period=='morning'))][:10]; return jsonify(matches=matches)
    except Exception: return jsonify(error='AI service unavailable or returned invalid data. Use manual booking.'),502
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(400)
@app.errorhandler(413)
def error_page(error):
    if request.path.startswith('/api/'):
        return jsonify(error=error.description),error.code
    return render_template('error.html',code=error.code,message={413:'The upload is too large. Choose a picture smaller than 2 MB.',400:'Please check your request and try again.',403:'You do not have permission to view this page.',404:'This page could not be found.'}[error.code]),error.code

with app.app_context(): init()
if __name__=='__main__': app.run(port=5000)
