// ===== VoltFix Logic — Edit Admin PIN / Services here =====
const SERVICES = [
  {icon:"🌀", name:"Fan Repair / Installation", price:"₹149", time:"30-45 min"},
  {icon:"🔌", name:"Home Wiring", price:"₹199", time:"1-2 hrs"},
  {icon:"💡", name:"Switch & Socket", price:"₹99", time:"20 min"},
  {icon:"🔋", name:"Inverter / UPS", price:"₹299", time:"45 min"},
  {icon:"⚡", name:"MCB & Meter", price:"₹249", time:"40 min"},
  {icon:"📺", name:"TV Repair", price:"₹399", time:"1 hr"},
  {icon:"💻", name:"Laptop / Desktop", price:"₹499", time:"1-2 hrs"},
  {icon:"📱", name:"Mobile / Tablet", price:"₹299", time:"45 min"},
  {icon:"❄️", name:"AC Repair", price:"₹599", time:"1 hr"},
  {icon:"🧊", name:"Refrigerator", price:"₹449", time:"1 hr"},
  {icon:"👕", name:"Washing Machine", price:"₹399", time:"1 hr"},
  {icon:"🛠️", name:"Other Repair", price:"On Inspection", time:"Varies"},
];
//const STATUSES = ["New","Confirmed","Assigned","In Progress","Completed","Cancelled"];

// Render services
const grid = document.getElementById('servicesGrid');
if(grid) grid.innerHTML = SERVICES.map(s=>`<div class="card service-card"><div style="font-size:28px">${s.icon}</div><h3>${s.name}</h3><p class="muted">${s.time}</p><p class="price">Starting ${s.price}</p><button class="btn btn-yellow" onclick="bookService('${s.name}')">Book →</button></div>`).join('');
function bookService(name){ document.getElementById('service').value=name; document.getElementById('book').scrollIntoView({behavior:'smooth'}); }
function toggleNav(){ document.getElementById('mainNav').classList.toggle('open'); }
const STATUSES = ["New", "Confirmed", "In Progress", "Completed", "Cancelled"];

// Settings - Supabase
// function getCfg(){ return {url: localStorage.getItem('supa_url')||'', key: localStorage.getItem('supa_key')||'', pin: localStorage.getItem('admin_pin')||'1234'}; } 
function getConfig() {
  return {
    url: localStorage.getItem("supa_url") || "",
    key: localStorage.getItem("supa_key") || ""
  };
}
function getAdminToken() { return sessionStorage.getItem("admin_token") || ""; }
function isAdminLoggedIn() { return !!getAdminToken(); }
function isConnected(){ return !!getConfig().url && !!getConfig().key; }
function updateBanner(){ const b=document.getElementById('demoBanner'); if(isConnected()){ b.textContent='● Live — Connected to Supabase • Bookings are saved'; b.style.background='#D1FAE5'; } }
updateBanner();
//function openSettings(){ document.getElementById('supaUrl').value=getCfg().url; document.getElementById('supaKey').value=getCfg().key; document.getElementById('adminPinSetting').value=getCfg().pin; document.getElementById('settingsModal').classList.remove('hidden'); }
function openSettings() {
  if (!isConnected()) {
    openSettingsSecure();
    return;
  }
  alert("Settings is admin-only. Login as Admin first.");
}
function openSettingsSecure() {
  if (!isAdminLoggedIn() && isConnected()) { alert("Login as Admin first."); return; }
  const c = getConfig();
  document.getElementById("supaUrl").value = c.url;
  document.getElementById("supaKey").value = c.key;
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function saveSettings(){
  localStorage.setItem('supa_url', document.getElementById('supaUrl').value.trim());
  localStorage.setItem('supa_key', document.getElementById('supaKey').value.trim());
  if (document.getElementById('settingsMsg')) document.getElementById('settingsMsg').textContent='Saved! Refreshing...';
  updateBanner(); setTimeout(()=>location.reload(),800);
}

// Local fallback
function localBookings(){ try{ return JSON.parse(localStorage.getItem('voltfix_bookings')||'[]'); }catch{ return []; } }
function saveLocal(b){ const a=localBookings(); a.unshift(b); localStorage.setItem('voltfix_bookings', JSON.stringify(a)); }

// Supabase helpers
async function supaFetch(path, method='GET', body){
  const c=getConfig();
  const token = (method !== 'POST' && isAdminLoggedIn()) ? getAdminToken() : c.key;
  const res=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/'+path, {method, headers: { apikey: c.key, Authorization: "Bearer " + token ,'Content-Type':'application/json','Prefer':'return=representation'}, body: body?JSON.stringify(body):undefined});
  if(!res.ok) throw new Error('Supabase error '+res.status); return res.json();
}
async function fetchBookings(){
  if (!isAdminLoggedIn()) { return []; }
  if(isConnected()){ try{ return await supaFetch('bookings?select=*&order=created_at.desc'); }catch(e){ alert('Supabase not connected / table missing. Check Settings. Showing local bookings.'); return localBookings(); } }
  return localBookings();
}
async function createBooking(data){
  if(isConnected()){ try{ const r=await supaFetch('bookings','POST',data); return r[0]; }catch(e){ saveLocal(data); return data; } }
  saveLocal(data); return data;
}

// Booking form
document.getElementById('date').min = new Date().toISOString().split('T')[0];
document.getElementById('bookingForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const booking_id='VF-'+Math.floor(1000+Math.random()*9000);
  const data={booking_id, name:document.getElementById('name').value, phone:document.getElementById('phone').value, service:document.getElementById('service').value, area:document.getElementById('area').value, date:document.getElementById('date').value, time_slot:document.getElementById('timeSlot').value, problem:document.getElementById('problem').value, status:'New'};
  await createBooking(data);
  document.getElementById('successId').textContent=booking_id;
  document.getElementById('bookingSuccess').classList.remove('hidden');
  e.target.reset();
});

// Track
async function trackBooking() {
  const q = document.getElementById("trackInput").value.trim();
  const phone = document.getElementById("trackPhone").value.trim();
  if (!q || !phone) { document.getElementById("trackResult").innerHTML = "<p>Enter BOTH Booking ID and Phone.</p>"; return; }
  const c = getConfig();
  const res = await fetch(c.url.replace(/\/$/,'') + "/rest/v1/rpc/get_my_booking", {
    method: "POST",
    headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_booking_id: q, p_phone: phone })
  });
  const data = await res.json();
  const found = Array.isArray(data) ? data[0] : data;
  document.getElementById("trackResult").innerHTML = found
    ? `<div class="success"><b>${found.booking_id}</b> - ${found.service}<br>Status: <b>${found.status}</b><br>${found.date} - ${found.area}</div>`
    : `<p>No booking found for that ID + Phone.</p>`;
}

// Admin
function openAdmin(){ document.getElementById('adminModal').classList.remove('hidden'); }
async function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  if (!email || !password) { document.getElementById("loginError").textContent = "Enter email + password."; return; }
  const c = getConfig();
  const res = await fetch(c.url.replace(/\/$/,'') + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: c.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) { document.getElementById("loginError").textContent = "Login failed: " + (data.error_description || "Check email/password in Supabase > Authentication > Users"); return; }
  sessionStorage.setItem("admin_token", data.access_token);
  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("adminContent").classList.remove("hidden");
  renderAdmin();
}
function adminLogout() {
  sessionStorage.removeItem("admin_token");
  document.getElementById("adminContent").classList.add("hidden");
  document.getElementById("adminLogin").classList.remove("hidden");
  closeModal('adminModal');
}
async function renderAdmin(){
  const all=await fetchBookings();
  const q=(document.getElementById('adminSearch').value||'').toLowerCase();
  const f=document.getElementById('adminFilter').value;
  let list=all.filter(b=>(!q || (b.name+b.phone).toLowerCase().includes(q)) && (f==='All' || b.status===f));
  document.getElementById('statTotal').textContent='Total: '+all.length;
  document.getElementById('statNew').textContent='New: '+all.filter(b=>b.status==='New').length;
  document.getElementById('statDone').textContent='Completed: '+all.filter(b=>b.status==='Completed').length;
  document.getElementById('adminList').innerHTML = list.length? list.map(b=>`<div class="booking-item"><b>${b.booking_id} — ${b.service}</b><br>👤 ${b.name} • <a href="tel:${b.phone}">📞 ${b.phone}</a><br>📍 ${b.area} • 📅 ${b.date} ${b.time_slot||''}<br>📝 ${b.problem||'—'}<br><label>Status</label><select onchange="updateStatus('${b.booking_id}', this.value, ${b.id||0})">${STATUSES.map(s=>`<option ${s===b.status?'selected':''}>${s}</option>`).join('')}</select></div>`).join('') : '<p>No bookings yet.</p>';
}
async function updateStatus(booking_id, status, id){
  if (!isAdminLoggedIn()) { alert("Admin login required to change status."); return; }
  if(isConnected() && id){ try{ await supaFetch('bookings?id=eq.'+id,'PATCH',{status}); }catch(e){ alert('Could not update in Supabase'); } }
  else { const a=localBookings(); const i=a.findIndex(b=>b.booking_id===booking_id); if(i>=0){ a[i].status=status; localStorage.setItem('voltfix_bookings', JSON.stringify(a)); } }
  renderAdmin();
}
