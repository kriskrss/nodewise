"use strict";
const KEY = "nodewise-v1";
const $ = s => document.querySelector(s);
const PALETTE = ["#f26d5b","#f5a13d","#f2d13d","#4caf7d","#3ec6b8","#5aa9e6","#9b7bea","#e77fb0",
                 "#ff8a5c","#c0c6d4","#8a7fff","#5bd0f2","#a3d65b","#f25b8a","#b08968","#6b7280"];
let nodes = [], view = "map", selectedId = null, currentProject = null, currentSmart = null;
let cam = {x: -1600, y: -1250, k: 0.85};
let lastDeleted = null, editId = null, radialId = null;

function uid(){ return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function todayStr(d){ d = d || new Date(); const p=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return todayStr(d); }
function byId(id){ return nodes.find(n=>n.id===id); }
function children(id){ return nodes.filter(n=>n.parentId===id).sort((a,b)=>a.order-b.order); }
function roots(){ return nodes.filter(n=>!n.parentId).sort((a,b)=>a.order-b.order); }
function rootOf(n){ while(n && n.parentId) n = byId(n.parentId); return n; }
function descendants(id){ const out=[]; (function walk(i){ children(i).forEach(c=>{out.push(c); walk(c.id);}); })(id); return out; }
function isTask(n){ return n.isTask !== false; }
function save(){ localStorage.setItem(KEY, JSON.stringify(nodes)); }
function load(){
  try{ const raw = localStorage.getItem(KEY); if(raw){ nodes = JSON.parse(raw); return; } }catch(e){}
  nodes = seed(); save();
}
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden"); setTimeout(()=>t.classList.add("hidden"),2200); }

/* ---------------- seed (matches the video) ---------------- */
function seed(){
  const S=[]; let o=0;
  function add(title, parentId, opts){ opts=opts||{}; const n=Object.assign({id:uid()+ (o++), title, parentId:parentId||null, note:"", emoji:"", color:"", direction:"right", isTask:true, done:false, due:"", slot:"", notNow:false, tags:[], order:o, collapsed:false, lineWidth:3}, opts); S.push(n); return n; }
  const home = add("Home", null, {emoji:"🏠", color:"#f26d5b", direction:"left", isTask:false});
  const house = add("Household", home.id, {isTask:false});
  add("Water indoor plants", house.id, {slot:"afternoon"});
  add("Change bed sheets", house.id, {});
  add("Buy groceries", house.id, {});
  add("Pay electricity bill", house.id, {tags:["Important"], slot:"quick"});
  const maint = add("Maintenance", home.id, {emoji:"🔧", isTask:false});
  add("Fix bathroom shelf", maint.id, {});
  add("Replace bulb living room", maint.id, {});
  const trip = add("Trip to Austria", null, {emoji:"🇦🇹", color:"#4caf7d", direction:"right", isTask:false, due:addDays(10), note:"- 4 Days\n- Trip with Anna\n- Take a lot of Photos for Family"});
  add("Book Flight", trip.id, {tags:["Important"], slot:"quick", due:todayStr()});
  const itin = add("Itinerary", trip.id, {isTask:false});
  add("Vienna", itin.id, {}); add("Salzburg", itin.id, {}); add("Hallstatt", itin.id, {});
  const pack = add("Pack luggage", trip.id, {emoji:"🧳"});
  add("Passport", pack.id, {tags:["Important"]});
  add("Camera", pack.id, {note:"- Charge both batteries the night before.\n- Empty the memory card.\n- The small lens is enough for the city."});
  add("Clothing", pack.id, {});
  add("Phone charger", pack.id, {});
  add("Prepare Luggage List", pack.id, {tags:["Quick Wins"], slot:"quick"});
  const acc = add("Accommodation", trip.id, {emoji:"🏨", isTask:false});
  add("Book Hotel", acc.id, {tags:["Waiting"], due:addDays(4), note:"Anna's pick: the small place behind the Naschmarkt, balcony room, 118€ with breakfast."});
  const hob = add("Hobbies", null, {emoji:"🎨", color:"#e77fb0", direction:"right", isTask:false});
  add("Practice Guitar", hob.id, {});
  add("Finish God of Small Things", hob.id, {});
  const work = add("Work", null, {emoji:"💼", color:"#9b7bea", direction:"left", isTask:false});
  const qr = add("Quarterly Review", work.id, {isTask:false});
  add("Rehearse Talking Points", qr.id, {slot:"morning"});
  add("Quarterly Review", qr.id, {slot:"afternoon"});
  add("Send Meeting Note", work.id, {slot:"quick"});
  return S;
}

/* ---------------- smart lists ---------------- */
function smartDef(key){
  const t = todayStr();
  const open = nodes.filter(n=>isTask(n) && !n.done);
  switch(key){
    case "inbox": return {title:"Inbox", list: open.filter(n=>!n.due && !n.slot && !n.tags.length && !n.notNow)};
    case "today": return {title:"Today", list: todayTasks()};
    case "upcoming": return {title:"Upcoming", list: open.filter(n=>n.due && n.due > t).sort((a,b)=>a.due<b.due?-1:1)};
    case "notnow": return {title:"Not Now", list: nodes.filter(n=>isTask(n) && n.notNow && !n.done)};
    case "upnext": return {title:"Up Next", list: open.filter(n=>!n.notNow && ((n.due && n.due <= addDays(7)) || n.tags.includes("Important")))};
    case "logbook": return {title:"Logbook", list: nodes.filter(n=>isTask(n) && n.done)};
    case "deadlines": return {title:"Deadlines", list: open.filter(n=>n.due).sort((a,b)=>a.due<b.due?-1:1)};
    case "tags": return {title:"Tags", list: open.filter(n=>n.tags.length)};
  }
  return {title:key, list:[]};
}
function todayTasks(){
  const t = todayStr();
  return nodes.filter(n=>isTask(n) && !n.done && !n.notNow && (n.due===t || (n.slot && (!n.due || n.due<=t))));
}
const SMART = [
  ["inbox","Inbox","📥","#5aa9e6"],["today","Today","⭐","#d9a514"],["upcoming","Upcoming","📅","#c94f43"],
  ["notnow","Not Now","🗄","#a9805a"],["upnext","Up Next","➤","#2f9e8f"],["logbook","Logbook","📗","#3f9e4d"],
  ["tags","Tags","🏷","#7a5fd0"],["deadlines","Deadlines","🚩","#c94f43"]
];

/* ---------------- navigation ---------------- */
function go(v, arg){
  view = v;
  document.querySelectorAll(".view").forEach(s=>s.classList.remove("active"));
  $("#view-"+v).classList.add("active");
  document.querySelectorAll("#bottombar button").forEach(b=>b.classList.toggle("active", b.dataset.go===v || (v==="project"||v==="smart"||v==="search") && b.dataset.go==="home"));
  $("#fab").style.display = (v==="project"||v==="smart") ? "block" : "block";
  if(v==="map") renderMap();
  if(v==="home") renderHome();
  if(v==="today") renderToday();
  if(v==="project") renderProject(arg);
  if(v==="smart") renderSmart(arg);
  if(v==="search"){ setTimeout(()=>$("#search-input").focus(),50); renderSearch($("#search-input").value||""); }
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click", ()=>go(b.dataset.go)));

/* ---------------- map ---------------- */
const NW=176, NH=48, XSTEP=235, YSTEP=58;
function subtreeH(n){
  const ch = n.collapsed ? [] : children(n.id);
  if(!ch.length) return YSTEP;
  return Math.max(YSTEP, ch.reduce((s,c)=>s+subtreeH(c),0));
}
let pos = {};
function layout(){
  pos = {}; let y = 300;
  roots().forEach(r=>{
    const h = subtreeH(r);
    place(r, 2000, y + h/2);
    y += h + 90;
  });
}
function place(n, x, cy){
  pos[n.id] = {x, y: cy};
  if(n.collapsed) return;
  const ch = children(n.id); if(!ch.length) return;
  const dir = (rootOf(n).direction === "left") ? -1 : 1;
  let total = ch.reduce((s,c)=>s+subtreeH(c),0);
  let cur = cy - total/2;
  ch.forEach(c=>{ const h=subtreeH(c); place(c, x + dir*XSTEP, cur + h/2); cur += h; });
}
function renderMap(){
  layout();
  const world = $("#world");
  world.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.k})`;
  $("#zoom-label").textContent = Math.round(cam.k*100)+"%";
  const svg = $("#edges"); let paths = "";
  nodes.forEach(n=>{
    if(!n.parentId || !pos[n.id] || !pos[n.parentId]) return;
    const root = rootOf(n); if(root.collapsed && root.id!==n.parentId && isHidden(n)) return;
    if(isHidden(n)) return;
    const p = pos[n.parentId], c = pos[n.id];
    const dir = root.direction==="left" ? -1 : 1;
    const x1 = p.x + (dir>0 ? NW/2 : -NW/2), y1 = p.y;
    const x2 = c.x + (dir>0 ? -NW/2 : NW/2), y2 = c.y;
    const mx = (x1+x2)/2;
    const col = c.color || root.color || "#888";
    paths += `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="${root.lineWidth||3}" opacity="0.85"/>`;
  });
  svg.innerHTML = paths;
  const wrap = $("#nodes"); wrap.innerHTML = "";
  nodes.forEach(n=>{
    if(isHidden(n) || !pos[n.id]) return;
    const root = rootOf(n);
    const d = document.createElement("div");
    d.className = "node" + (n.done && isTask(n) ? " done":"") + (n.id===selectedId ? " selected":"");
    d.style.left = (pos[n.id].x - NW/2)+"px"; d.style.top = (pos[n.id].y - NH/2)+"px";
    d.style.setProperty("--nc", n.color || root.color || "#888");
    const kidCount = children(n.id).length;
    d.innerHTML = `${n.emoji?`<span class="em">${esc(n.emoji)}</span>`:""}<span class="tt">${esc(n.title)}</span>${n.due?`<span class="duedot">●</span>`:""}${kidCount?`<button class="fold" data-fold="${n.id}">${n.collapsed?"+":kidCount}</button>`:""}<button class="plus" data-plus="${n.id}">+</button>`;
    d.addEventListener("click", e=>{
      if(e.target.dataset.plus){ openSheet(null, n.id); return; }
      if(e.target.dataset.fold){ n.collapsed = !n.collapsed; save(); renderMap(); return; }
      selectedId = n.id; renderMap();
    });
    d.addEventListener("dblclick", ()=>openSheet(n.id));
    let lp = null;
    d.addEventListener("pointerdown", ()=>{ lp = setTimeout(()=>{ selectedId=n.id; openRadial(n.id); }, 550); });
    ["pointerup","pointerleave","pointermove"].forEach(ev=>d.addEventListener(ev, ()=>clearTimeout(lp)));
    wrap.appendChild(d);
  });
}
function isHidden(n){
  let p = n.parentId;
  while(p){ const par = byId(p); if(!par) break; if(par.collapsed) return true; p = par.parentId; }
  return false;
}
function esc(s){ return String(s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* pan + zoom */
(function(){
  const wrap = $("#canvas-wrap"); let drag=null, pinch=null;
  wrap.addEventListener("pointerdown", e=>{
    if(e.target.closest(".node") || e.target.closest("#map-tools")) return;
    drag = {sx:e.clientX, sy:e.clientY, cx:cam.x, cy:cam.y};
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointermove", e=>{
    if(!drag) return;
    cam.x = drag.cx + (e.clientX - drag.sx); cam.y = drag.cy + (e.clientY - drag.sy);
    renderMap();
  });
  wrap.addEventListener("pointerup", ()=>drag=null);
  wrap.addEventListener("wheel", e=>{ e.preventDefault(); zoom(e.deltaY<0 ? 1.08 : 0.93); }, {passive:false});
  wrap.addEventListener("touchmove", e=>{
    if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.hypot(dx,dy);
      if(pinch) zoom(dist/pinch); pinch=dist;
    }
  }, {passive:true});
  wrap.addEventListener("touchend", ()=>pinch=null);
})();
function zoom(f){ cam.k = Math.min(2.2, Math.max(0.15, cam.k*f)); renderMap(); }
$("#btn-zoom-in").addEventListener("click", ()=>zoom(1.2));
$("#btn-zoom-out").addEventListener("click", ()=>zoom(0.83));
$("#btn-fit").addEventListener("click", fitMap);
function fitMap(){
  layout(); const rs = roots(); if(!rs.length) return;
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  Object.values(pos).forEach(p=>{ minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); });
  const w=$("#canvas-wrap").clientWidth, h=$("#canvas-wrap").clientHeight;
  cam.k = Math.min(1, Math.min(w/((maxX-minX)+340), h/((maxY-minY)+220)));
  cam.x = w/2 - ((minX+maxX)/2)*cam.k; cam.y = h/2 - ((minY+maxY)/2)*cam.k;
  renderMap();
}
$("#btn-undo").addEventListener("click", ()=>{
  if(!lastDeleted){ toast("Nothing to undo"); return; }
  nodes = nodes.concat(lastDeleted); lastDeleted=null; save(); renderMap(); toast("Restored");
});

/* ---------------- radial menu ---------------- */
function openRadial(id){ radialId=id; $("#radial").classList.remove("hidden"); }
function closeRadial(){ $("#radial").classList.add("hidden"); }
$("#radial-close").addEventListener("click", closeRadial);
$("#radial").addEventListener("click", e=>{ if(e.target.id==="radial") closeRadial(); });
document.querySelectorAll("#radial .rbtn").forEach(b=>b.addEventListener("click", ()=>{
  const n = byId(radialId); closeRadial(); if(!n) return;
  const act = b.dataset.act;
  if(act==="add") openSheet(null, n.id);
  if(act==="schedule"){ openSheet(n.id); setTimeout(()=>$("#f-due").focus(),80); }
  if(act==="tag"){ openSheet(n.id); setTimeout(()=>$("#f-tags").focus(),80); }
  if(act==="done"){ n.done = !n.done; save(); renderMap(); }
  if(act==="cut") deleteNode(n.id);
  if(act==="color") openColor(n.id);
}));
function deleteNode(id){
  const n = byId(id); if(!n) return;
  const all = [n, ...descendants(id)];
  lastDeleted = all;
  const ids = new Set(all.map(x=>x.id));
  nodes = nodes.filter(x=>!ids.has(x.id));
  if(selectedId===id) selectedId=null;
  save(); if(view==="map") renderMap(); if(view==="project") go("home");
  toast("Deleted. Undo is in the map tools.");
}
/* color popover */
let colorId=null;
function openColor(id){
  colorId=id; const n=byId(id); const cur=n.color || rootOf(n).color;
  const pal=$("#palette"); pal.innerHTML="";
  PALETTE.forEach(c=>{
    const s=document.createElement("button"); s.className="swatch"+(c===cur?" on":""); s.style.background=c;
    s.addEventListener("click", ()=>{ n.color=c; save(); closeColor(); renderMap(); });
    pal.appendChild(s);
  });
  document.querySelectorAll("#colorpop [data-thick]").forEach(b=>{
    b.classList.toggle("on", Number(b.dataset.thick)===Number(rootOf(n).lineWidth||3));
    b.onclick=()=>{ rootOf(n).lineWidth=Number(b.dataset.thick); save(); openColor(id); renderMap(); };
  });
  $("#colorpop").classList.remove("hidden");
}
function closeColor(){ $("#colorpop").classList.add("hidden"); }
$("#color-reset").addEventListener("click", ()=>{ const n=byId(colorId); if(n){ n.color=""; save(); } closeColor(); renderMap(); });
document.addEventListener("pointerdown", e=>{ if(!e.target.closest("#colorpop") && !e.target.closest("#radial")) closeColor(); });


/* ---------------- lists / home / today / project ---------------- */
function daysLabel(n){
  if(!n.due) return "";
  const t = new Date(todayStr()+"T00:00:00"), d = new Date(n.due+"T00:00:00");
  const diff = Math.round((d - t)/86400000);
  if(diff===0) return "today"; if(diff===1) return "1d left"; if(diff>1) return diff+"d left";
  if(diff===-1) return "overdue by 1d"; return "overdue by "+(-diff)+"d";
}
function tagHtml(n){ return n.tags.map(t=>`<span class="tag ${t==="Waiting"?"wait":""}">${esc(t)}</span>`).join(""); }
function pathOf(n){ const r=rootOf(n); return r && r.id!==n.id ? "Personal / "+r.title : "Personal"; }
function taskRow(n, opts){
  opts = opts||{};
  const row = document.createElement("div");
  row.className = "task-row" + (n.done ? " done":"");
  row.style.marginLeft = (opts.indent||0)+"px";
  row.innerHTML = `${opts.drag?`<span class="handle" draggable="true">⠿</span>`:""}
    <button class="cb" aria-label="done">${n.done?"✓":""}</button>
    <div class="t-main"><div class="t-title">${n.emoji?esc(n.emoji)+" ":""}${esc(n.title)} ${n.due?`<span class="daysleft">${daysLabel(n)}</span>`:""}</div>
    ${opts.sub?`<div class="t-sub">${tagHtml(n)} ${esc(pathOf(n))}</div>`: (n.tags.length?`<div class="t-sub">${tagHtml(n)}</div>`:"")}
    ${opts.note && n.note?`<div class="t-note">${esc(n.note)}</div>`:""}
    </div>`;
  row.querySelector(".cb").addEventListener("click", e=>{ e.stopPropagation(); n.done=!n.done; save(); refreshView(); });
  row.querySelector(".t-main").addEventListener("click", ()=>openSheet(n.id));
  if(opts.drag){
    const h = row.querySelector(".handle");
    h.addEventListener("dragstart", e=>{ e.dataTransfer.setData("text/plain", n.id); });
    row.addEventListener("dragover", e=>{ e.preventDefault(); });
    row.addEventListener("drop", e=>{
      e.preventDefault();
      const from = byId(e.dataTransfer.getData("text/plain"));
      if(!from || from.parentId!==n.parentId || from.id===n.id) return;
      const sibs = children(n.parentId);
      const fi = sibs.findIndex(s=>s.id===from.id), ti = sibs.findIndex(s=>s.id===n.id);
      sibs.splice(ti, 0, sibs.splice(fi,1)[0]);
      sibs.forEach((s,i)=>s.order=i);
      save(); renderProject(currentProject);
    });
  }
  return row;
}
function refreshView(){
  if(view==="map") renderMap(); else if(view==="home") renderHome();
  else if(view==="today") renderToday(); else if(view==="project") renderProject(currentProject);
  else if(view==="smart") renderSmart(currentSmart);
}
function renderHome(){
  const grid = $("#smart-grid"); grid.innerHTML="";
  SMART.forEach(([key,label,ic,col])=>{
    const c = document.createElement("button");
    c.className="smart-card"; c.style.background=col;
    c.innerHTML = `<span class="count">${smartDef(key).list.length}</span><span class="lbl">${label}</span><span class="ic">${ic}</span>`;
    c.addEventListener("click", ()=>go("smart", key));
    grid.appendChild(c);
  });
  const pl = $("#project-list"); pl.innerHTML="";
  roots().forEach(r=>{
    const open = [r,...descendants(r.id)].filter(n=>isTask(n) && !n.done).length;
    const b = document.createElement("button");
    b.className="project-row";
    b.innerHTML = `<span>${esc(r.emoji||"📁")}</span><span>${esc(r.title)}</span><span class="cnt">${open} open</span><span class="chev">›</span>`;
    b.addEventListener("click", ()=>go("project", r.id));
    pl.appendChild(b);
  });
}
function renderProject(id){
  currentProject = id; const r = byId(id); if(!r){ go("home"); return; }
  $("#project-head").innerHTML = `<div class="p-title">${esc(r.emoji||"")} ${esc(r.title)}</div>
    ${r.due?`<div class="t-sub">📅 ${esc(r.due)} · ${daysLabel(r)}</div>`:""}
    ${r.note?`<div class="p-note">${esc(r.note)}</div>`:""}`;
  const all = [r, ...descendants(id)];
  const counts = {};
  all.forEach(n=>n.tags.forEach(t=>counts[t]=(counts[t]||0)+1));
  $("#project-tags").innerHTML = Object.entries(counts).map(([t,c])=>`<span class="tag ${t==="Waiting"?"wait":""}">${esc(t)} ${c}</span>`).join("");
  const box = $("#project-tasks"); box.innerHTML="";
  (function walk(pid, depth){
    children(pid).forEach(n=>{
      box.appendChild(taskRow(n, {indent: depth*20, drag:true, note:true}));
      if(!n.collapsed) walk(n.id, depth+1);
    });
  })(id, 0);
  if(!children(id).length) box.innerHTML = `<div class="empty">No tasks yet. Tap + to add one.</div>`;
}
function renderToday(){
  $("#today-date").textContent = new Date().toLocaleDateString(undefined,{weekday:"short", day:"numeric", month:"short"});
  const box = $("#today-list"); box.innerHTML="";
  const tasks = todayTasks();
  const groups = [["quick","Quick Wins"],["morning","Morning"],["afternoon","Afternoon"],["","Any time"]];
  let any=false;
  groups.forEach(([slot,label])=>{
    const g = tasks.filter(n=>(n.slot||"")===slot);
    if(!g.length) return; any=true;
    const h=document.createElement("div"); h.className="group-head"; h.textContent=label; box.appendChild(h);
    g.forEach(n=>box.appendChild(taskRow(n,{sub:true})));
  });
  if(!any) box.innerHTML = `<div class="empty">Nothing set for today. Add a task and pick Today, or set a slot.</div>`;
}
function renderSmart(key){
  currentSmart = key; const def = smartDef(key);
  $("#smart-title").textContent = def.title;
  const box = $("#smart-list"); box.innerHTML="";
  if(key==="tags"){
    const byTag = {};
    def.list.forEach(n=>n.tags.forEach(t=>{ (byTag[t]=byTag[t]||[]).push(n); }));
    Object.entries(byTag).forEach(([t,arr])=>{
      const h=document.createElement("div"); h.className="group-head"; h.textContent=t; box.appendChild(h);
      arr.forEach(n=>box.appendChild(taskRow(n,{sub:true})));
    });
    if(!Object.keys(byTag).length) box.innerHTML=`<div class="empty">No tagged tasks yet.</div>`;
    return;
  }
  if(!def.list.length){ box.innerHTML = `<div class="empty">Nothing here yet.</div>`; return; }
  def.list.forEach(n=>box.appendChild(taskRow(n,{sub:true})));
}
function renderSearch(q){
  const box = $("#search-results"); box.innerHTML="";
  q = (q||"").trim().toLowerCase();
  const hits = q ? nodes.filter(n=>n.title.toLowerCase().includes(q) || (n.note||"").toLowerCase().includes(q)) : roots().concat(todayTasks().slice(0,4));
  if(!hits.length){ box.innerHTML = `<div class="empty">No matches.</div>`; return; }
  hits.forEach(n=>box.appendChild(taskRow(n,{sub:true})));
}
$("#search-input").addEventListener("input", e=>renderSearch(e.target.value));
$("#btn-search").addEventListener("click", ()=>go("search"));
$("#btn-menu").addEventListener("click", ()=>go("home"));

/* ---------------- edit sheet ---------------- */
function openSheet(id, parentId){
  editId = id || null;
  const n = id ? byId(id) : null;
  $("#f-title").value = n ? n.title : "";
  $("#f-note").value = n ? (n.note||"") : "";
  $("#f-emoji").value = n ? (n.emoji||"") : "";
  $("#f-istask").checked = n ? isTask(n) : true;
  $("#f-done").checked = n ? !!n.done : false;
  $("#f-due").value = n ? (n.due||"") : "";
  $("#f-slot").value = n ? (n.slot||"") : "";
  $("#f-tags").value = n ? n.tags.join(", ") : "";
  $("#f-notnow").checked = n ? !!n.notNow : false;
  const sel = $("#f-parent"); sel.innerHTML = `<option value="">— Root project —</option>`;
  nodes.filter(x=>!id || (x.id!==id && !descendants(id).some(d=>d.id===x.id))).forEach(x=>{
    const o = document.createElement("option"); o.value=x.id; o.textContent = (x.emoji?x.emoji+" ":"") + x.title + (x.parentId ? "  ("+ (byId(x.parentId)||{}).title +")" : "");
    sel.appendChild(o);
  });
  sel.value = n ? (n.parentId||"") : (parentId||"");
  $("#btn-delete").style.visibility = id ? "visible" : "hidden";
  $("#sheet").classList.remove("hidden"); $("#sheet-backdrop").classList.remove("hidden");
  setTimeout(()=>$("#f-title").focus(), 60);
}
function closeSheet(){ $("#sheet").classList.add("hidden"); $("#sheet-backdrop").classList.add("hidden"); }
$("#sheet-backdrop").addEventListener("click", closeSheet);
function readSheet(){
  return {
    title: $("#f-title").value.trim(),
    note: $("#f-note").value.trim(),
    emoji: $("#f-emoji").value.trim(),
    isTask: $("#f-istask").checked,
    done: $("#f-done").checked,
    due: $("#f-due").value || "",
    slot: $("#f-slot").value || "",
    tags: $("#f-tags").value.split(",").map(s=>s.trim()).filter(Boolean),
    notNow: $("#f-notnow").checked,
    parentId: $("#f-parent").value || null
  };
}
function saveSheet(addAnother){
  const v = readSheet();
  if(!v.title){ toast("Type a title first"); return; }
  if(editId){
    Object.assign(byId(editId), v);
  } else {
    const sibs = v.parentId ? children(v.parentId) : roots();
    const parent = v.parentId ? byId(v.parentId) : null;
    const n = Object.assign({id:uid(), color:"", direction:"right", collapsed:false, lineWidth:3, order: sibs.length ? Math.max(...sibs.map(s=>s.order))+1 : 0}, v);
    if(!v.parentId){ n.color = PALETTE[nodes.filter(x=>!x.parentId).length % PALETTE.length]; n.isTask=false; }
    if(parent && parent.collapsed) parent.collapsed = false;
    nodes.push(n); editId = n.id; selectedId = n.id;
  }
  save();
  if(addAnother){
    const p = v.parentId; editId = null;
    openSheet(null, p); toast("Saved. Add the next one.");
  } else { closeSheet(); }
  refreshView(); if(view==="map") renderMap();
}
$("#btn-save").addEventListener("click", ()=>saveSheet(false));
$("#btn-add-another").addEventListener("click", ()=>saveSheet(true));
$("#btn-add-child").addEventListener("click", ()=>{
  if(!editId){ toast("Save this one first, then add inside it"); return; }
  const id = editId; closeSheet(); openSheet(null, id);
});
$("#btn-delete").addEventListener("click", ()=>{ if(editId){ closeSheet(); deleteNode(editId); refreshView(); } });
document.querySelectorAll("[data-qd]").forEach(b=>b.addEventListener("click", ()=>{
  const k = b.dataset.qd;
  if(k==="today") $("#f-due").value = todayStr();
  if(k==="tomorrow") $("#f-due").value = addDays(1);
  if(k==="clear"){ $("#f-due").value=""; $("#f-notnow").checked=false; }
  if(k==="notnow"){ $("#f-notnow").checked = true; $("#f-due").value=""; }
}));

/* ---------------- fab / data ---------------- */
$("#fab").addEventListener("click", ()=>{
  if(view==="project" && currentProject) openSheet(null, currentProject);
  else if(view==="map" && selectedId) openSheet(null, selectedId);
  else openSheet(null, null);
});
$("#btn-export").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(nodes,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nodewise-export.json"; a.click();
  URL.revokeObjectURL(a.href);
});
$("#file-import").addEventListener("change", e=>{
  const f = e.target.files[0]; if(!f) return;
  f.text().then(txt=>{
    try{ const data = JSON.parse(txt); if(!Array.isArray(data)) throw 0; nodes = data; save(); go("map"); fitMap(); toast("Imported"); }
    catch(err){ toast("That file could not be read"); }
  });
});
$("#btn-reset").addEventListener("click", ()=>{
  if(confirm("Replace all data with the example data?")){ nodes = seed(); save(); selectedId=null; go("map"); fitMap(); }
});

/* ---------------- init ---------------- */
load();
go("map");
fitMap();
