const csrf = document.querySelector('meta[name=csrf]')?.content;
const role = document.querySelector('#role')?.dataset.role;
const actions = {
  patient: {Booked:['Cancelled'],Confirmed:['Cancelled']},
  assistant: {Booked:['Confirmed','Cancelled'],Confirmed:['Waiting','Cancelled']},
  doctor: {Waiting:['In consultation'],'In consultation':['Completed']},
  admin: {Booked:['Confirmed','Cancelled'],Confirmed:['Waiting','Cancelled'],Waiting:['In consultation'],'In consultation':['Completed']}
};
let appointments = [];
const active = ['Booked','Confirmed','Waiting','In consultation'];
const now = () => new Date().toLocaleString('sv-SE').replace(' ','T').slice(0,16);
const readable = date => date.replace('T',' · ');

let availableSlots = [];
function fillSlots(slots) {
  availableSlots = slots;
  const dateSelect=document.querySelector('#slot-date');
  dateSelect.replaceChildren(new Option('All dates',''));
  for (const date of [...new Set(slots.map(s=>s.start.slice(0,10)))]) dateSelect.add(new Option(date,date));
  document.querySelector('#slot-date-label').hidden = !slots.length;
  renderSlots();
  document.querySelector('#booking').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderSlots() {
  const date=document.querySelector('#slot-date').value;
  const slots=availableSlots.filter(s=>!date || s.start.startsWith(date));
  const select = document.querySelector('#slots');
  if (!select) return;
  select.replaceChildren(new Option(slots.length ? 'Choose a time' : 'No available slots', ''));
  const calendar = document.querySelector('#calendar');
  calendar.replaceChildren();
  for (const slot of slots) {
    select.add(new Option(slot.name + ' · ' + readable(slot.start), slot.id));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary slot-button';
    button.textContent = readable(slot.start);
    button.onclick = () => {
      select.value = slot.id;
      document.querySelectorAll('.slot-button').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
    };
    calendar.append(button);
  }
}
document.querySelector('#slot-date')?.addEventListener('change',renderSlots);
document.querySelectorAll('.choose').forEach(button => button.onclick = async () => {
  button.disabled=true;
  document.querySelector('#selected-doctor').textContent='Loading available times…';
  try {
    const response = await fetch('/api/slots?doctor=' + button.dataset.doctor);
    if (!response.ok) throw Error('Unable to load availability.');
    document.querySelector('#selected-doctor').textContent = 'Dr. ' + button.dataset.name;
    fillSlots(await response.json());
  } catch (error) { fillSlots([]); document.querySelector('#selected-doctor').textContent = error.message; }
  finally { button.disabled=false; }
});
document.querySelectorAll('.prompt-suggestion').forEach(button => button.onclick = () => {
  document.querySelector('#prompt').value = button.dataset.prompt;
});
document.querySelector('#smart')?.addEventListener('submit', async event => {
  event.preventDefault();
  const output = document.querySelector('#smart-result');
  const button=event.currentTarget.querySelector('button[type=submit]');
  button.disabled=true;
  output.textContent = 'Finding available times…';
  try {
    const response = await fetch('/api/smart', {
      method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
      body:JSON.stringify({text:document.querySelector('#prompt').value})
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    output.textContent = data.matches.length + ' matching times. Choose one below.';
    fillSlots(data.matches);
  } catch (error) { output.textContent = error.message; }
  finally { button.disabled=false; }
});

function filteredRows() {
  const view = document.querySelector('#appointment-view').value;
  const status = document.querySelector('#status-filter').value;
  const doctor = document.querySelector('#doctor-filter').value;
  const date = document.querySelector('#date-filter').value;
  return appointments.filter(a => {
    if (view === 'upcoming' && (!active.includes(a.status) || (role==='patient' && a.start < now() && !['Waiting','In consultation'].includes(a.status)))) return false;
    if (view === 'history' && active.includes(a.status) && (role!=='patient' || a.start >= now() || ['Waiting','In consultation'].includes(a.status))) return false;
    if (status !== 'all' && a.status !== status) return false;
    if (doctor !== 'all' && String(a.doctor_id) !== doctor) return false;
    if (date && !a.start.startsWith(date)) return false;
    return true;
  });
}
function hidden(form, name, value) {
  const input = document.createElement('input');
  input.type='hidden';input.name=name;input.value=value;form.append(input);
}
function statusButton(a, next) {
  const form=document.createElement('form');
  form.method='post';form.action='/appointment/'+a.id+'/status';
  hidden(form,'csrf',csrf);hidden(form,'status',next);
  const button=document.createElement('button');
  button.textContent=next;button.className='secondary small-button';
  if (next==='Cancelled') button.onclick=e => {
    if (!confirm('Cancel this appointment?')) e.preventDefault();
  };
  form.append(button);
  return form;
}
async function reschedule(a) {
  const dialog=document.querySelector('#reschedule-dialog');
  const form=document.querySelector('#reschedule-form');
  const select=document.querySelector('#reschedule-slot');
  const output=document.querySelector('#reschedule-status');
  const confirmButton=document.querySelector('#confirm-reschedule');
  form.action='/appointment/'+a.id+'/reschedule';
  document.querySelector('#reschedule-detail').textContent='Dr. '+a.doctor+' · Current visit: '+readable(a.start);
  select.replaceChildren(new Option('Choose a new time',''));
  confirmButton.disabled=true;
  output.textContent='Loading available times…';
  dialog.showModal();
  try {
    const response=await fetch('/api/slots?doctor='+a.doctor_id);
    if (!response.ok) throw Error('Unable to load open times.');
    const slots=await response.json();
    if (form.action.split('/').slice(-2)[0]!==String(a.id)) return;
    for (const slot of slots) select.add(new Option(readable(slot.start),slot.id));
    output.textContent=slots.length?'Choose an available time to continue.':'No alternative times available.';
  } catch (error) {output.textContent=error.message;}
}
document.querySelector('#reschedule-slot')?.addEventListener('change',event=>{
  document.querySelector('#confirm-reschedule').disabled=!event.target.value;
});
document.querySelector('#close-reschedule')?.addEventListener('click',()=>document.querySelector('#reschedule-dialog').close());
function renderAppointments() {
  const tbody=document.querySelector('#appointments');
  tbody.replaceChildren();
  const rows=filteredRows();
  if (!rows.length) {
    const tr=tbody.insertRow();const td=tr.insertCell();td.colSpan=5;
    td.textContent='No appointments match your filters.';return;
  }
  for (const a of rows) {
    const tr=tbody.insertRow();
    for (const value of [readable(a.start),a.doctor,a.patient,a.status]) {
      const td=tr.insertCell();td.textContent=value;
      if(value===a.status) td.className='status status-'+a.status.toLowerCase().replaceAll(' ','-');
    }
    const cell=tr.insertCell();cell.className='action-cell';
    for (const next of actions[role][a.status] || []) cell.append(statusButton(a,next));
    if (['patient','assistant','admin'].includes(role) && ['Booked','Confirmed'].includes(a.status) && a.start >= now()) {
      const button=document.createElement('button');button.textContent='Reschedule';
      button.className='secondary small-button';button.onclick=()=>reschedule(a);cell.append(button);
    }
    if (!cell.children.length) cell.textContent='—';
  }
}
function updateStats() {
  const ongoing=appointments.filter(a=>active.includes(a.status));
  let numbers;
  if (role==='patient') numbers=[
    ongoing.filter(a=>a.start>=now()).length,
    appointments.filter(a=>a.status==='Completed').length,
    appointments.filter(a=>a.status==='Cancelled').length
  ];
  else if (role==='doctor') numbers=[
    ongoing.filter(a=>a.start.startsWith(now().slice(0,10))).length,
    appointments.filter(a=>a.status==='Waiting').length,
    appointments.filter(a=>a.status==='Completed').length
  ];
  else numbers=[
    ongoing.length,
    appointments.filter(a=>a.status==='Waiting').length,
    appointments.filter(a=>a.status==='Completed').length
  ];
  document.querySelectorAll('[data-stat]').forEach((el,i)=>el.textContent=numbers[i]);
}
async function refresh() {
  try {
    const response=await fetch('/api/appointments');
    if (!response.ok) throw Error();
    appointments=await response.json();renderAppointments();updateStats();
    document.querySelector('#refresh-status').textContent='Updated just now · Auto-refresh every 8 seconds';
  } catch(error) {document.querySelector('#refresh-status').textContent='Could not refresh. Please try again.';}
}
if (role) {
  refresh();setInterval(refresh,8000);
  document.querySelector('#refresh').onclick=refresh;
  document.querySelectorAll('#appointment-view,#status-filter,#doctor-filter,#date-filter')
    .forEach(el=>el.addEventListener('change',renderAppointments));
}

// Password visibility only changes what is displayed, never the submitted value.
document.querySelectorAll('[data-password]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.password);
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.textContent = showing ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(showing));
  });
});
