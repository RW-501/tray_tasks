import { store } from './store.js';
import { initCalendarPopup, renderCalendar } from './calendar-popup.js';
import { initDeleteManager, requestDelete } from './delete-manager.js';
import { iso, occursOn, isOccurrenceComplete, taskOccurrencesForDate, recurrenceLabel } from './recurrence.js';
import { partOfDay, minutesBetween, activityStats, suggestionsFor } from './activity-engine.js';
import { initAnalytics } from './analytics.js';
import { initVoiceAssistant } from './voice-assistant.js';

const API_BASE_URL = 'https://us-central1-tray-tasks.cloudfunctions.net/api';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const parse = s => new Date(`${s}T12:00:00`);
const todayISO = () => iso(new Date());
const selectedISO = () => iso(state.selectedDate);
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const fmtTime = v => { if(!v) return ''; let [h,m]=v.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const fmtDate = v => v ? parse(v).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '';

const state = {
  selectedDate: new Date(),
  filter: 'all',
  search: '',
  advanced: {text:'',category:'',priority:'',status:'',goalId:'',projectId:'',frequency:''},
  galleryIndex: 0,
  slideshowTimer: null,
  reminderTimer: null,
  reminderIndex: 0,
  renderTimer: null,
};

const SETTINGS_KEY = 'command-center-v4-settings';
const defaultSettings = { compact:false, sidebarOpen:true, showCompleted:true, slideshow:true, activityBatchSize:3, autoDayPlan:true, voiceEnabled:false, voiceTalkBack:true, wakePhraseEnabled:true, wakePhrase:'Hey Tray', voiceScheduleEnabled:true, voiceStart:'07:00', voiceEnd:'22:00', voiceRate:1 };
let settings = {...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};

function toast(message){ const e=$('#toast'); if(!e) return console.info(message); e.textContent=message; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),2300); }
function taskForDate(){ return taskOccurrencesForDate(store.data.tasks, selectedISO()); }
function goalById(id){ return store.getById('goals',id); }
function projectById(id){ return store.getById('projects',id); }
function safeUrl(url){ try { const u=new URL(url); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
function linkify(text=''){
  const escaped=esc(text);
  return escaped.replace(/(https?:\/\/[^\s<]+)/gi, raw => {
    const clean=raw.replace(/[),.;!?]+$/,'');
    const trailing=raw.slice(clean.length);
    const url=safeUrl(clean);
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(clean)}</a>${esc(trailing)}` : raw;
  }).replace(/\n/g,'<br>');
}
function plainText(text=''){ return String(text).replace(/\s+/g,' ').trim(); }
function optionList(items, blank, selected=''){ return `<option value="">${esc(blank)}</option>` + (items||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.title)}</option>`).join(''); }
function closeModal(id){ bootstrap.Modal.getInstance($(id))?.hide(); }
function showModal(id){ bootstrap.Modal.getOrCreateInstance($(id)).show(); }
function dispatchRender(){ clearTimeout(state.renderTimer); state.renderTimer=setTimeout(()=>{ render(); renderCalendar(); },60); }

function saveSettings(){
  settings = {
    compact: $('#settingCompact')?.checked ?? settings.compact,
    sidebarOpen: $('#settingSidebarOpen')?.checked ?? settings.sidebarOpen,
    showCompleted: $('#settingShowCompleted')?.checked ?? settings.showCompleted,
    slideshow: $('#settingSlideshow')?.checked ?? settings.slideshow,
    autoDayPlan: $('#settingAutoPlan')?.checked ?? settings.autoDayPlan,
    activityBatchSize: Number($('#settingActivityBatch')?.value||settings.activityBatchSize||3),
    voiceEnabled: $('#settingVoiceEnabled')?.checked ?? settings.voiceEnabled,
    voiceTalkBack: $('#settingVoiceTalkBack')?.checked ?? settings.voiceTalkBack,
    wakePhraseEnabled: $('#settingWakePhrase')?.checked ?? settings.wakePhraseEnabled,
    wakePhrase: $('#settingWakePhraseText')?.value.trim() || settings.wakePhrase || 'Hey Tray',
    voiceScheduleEnabled: $('#settingVoiceSchedule')?.checked ?? settings.voiceScheduleEnabled,
    voiceStart: $('#settingVoiceStart')?.value || settings.voiceStart || '07:00',
    voiceEnd: $('#settingVoiceEnd')?.value || settings.voiceEnd || '22:00',
    voiceRate: Number($('#settingVoiceRate')?.value || settings.voiceRate || 1),
  };
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  applySettings();
}
function applySettings(){
  document.body.classList.toggle('compact-mode',!!settings.compact);
  $('#app')?.classList.toggle('sidebar-collapsed',!settings.sidebarOpen);
  if($('#settingCompact')) $('#settingCompact').checked=!!settings.compact;
  if($('#settingSidebarOpen')) $('#settingSidebarOpen').checked=!!settings.sidebarOpen;
  if($('#settingShowCompleted')) $('#settingShowCompleted').checked=!!settings.showCompleted;
  if($('#settingSlideshow')) $('#settingSlideshow').checked=!!settings.slideshow;
  if($('#settingAutoPlan')) $('#settingAutoPlan').checked=!!settings.autoDayPlan;
  if($('#settingActivityBatch')) $('#settingActivityBatch').value=String(settings.activityBatchSize||3);
  if($('#settingVoiceEnabled')) $('#settingVoiceEnabled').checked=!!settings.voiceEnabled;
  if($('#settingVoiceTalkBack')) $('#settingVoiceTalkBack').checked=!!settings.voiceTalkBack;
  if($('#settingWakePhrase')) $('#settingWakePhrase').checked=!!settings.wakePhraseEnabled;
  if($('#settingWakePhraseText')) $('#settingWakePhraseText').value=settings.wakePhrase||'Hey Tray';
  if($('#settingVoiceSchedule')) $('#settingVoiceSchedule').checked=!!settings.voiceScheduleEnabled;
  if($('#settingVoiceStart')) $('#settingVoiceStart').value=settings.voiceStart||'07:00';
  if($('#settingVoiceEnd')) $('#settingVoiceEnd').value=settings.voiceEnd||'22:00';
  if($('#settingVoiceRate')) $('#settingVoiceRate').value=String(settings.voiceRate||1);
  startSlideshow();
  window.dispatchEvent(new CustomEvent('command-center:voice-settings')); 
}

function localNow(){ const d=new Date(); return {date:iso(d),time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}; }
function pendingActivity(){ return (store.data.activityLogs||[]).filter(x=>x.needsReview); }
async function recordActivity({type,title,sourceCollection='',sourceId='',date='',time='',endTime='',durationMinutes=0,needsReview=false,meta={}}){
  const now=localNow(), actualDate=date||now.date, actualTime=time||now.time;
  return store.upsert('activityLogs',{id:uid(),type,title,sourceCollection,sourceId,date:actualDate,time:actualTime,endTime:endTime||'',durationMinutes:Number(durationMinutes)||minutesBetween(actualTime,endTime),partOfDay:partOfDay(actualTime),needsReview,meta,createdAt:Date.now(),updatedAt:Date.now()});
}
function maybeReviewActivity(){ const pending=pendingActivity(); const size=Math.max(2,Number(settings.activityBatchSize)||3); if(pending.length>=size) setTimeout(openActivityReview,450); }
function openActivityReview(){
  const rows=pendingActivity().slice(0,8); if(!rows.length)return toast('No completion times need review.');
  $('#activityReviewList').innerHTML=rows.map(x=>`<div class="activity-review-row" data-review-id="${x.id}"><div class="activity-name"><strong>${esc(x.title)}</strong><small>${esc(x.type)} · marked complete ${new Date(x.createdAt).toLocaleString()}</small></div><div><label class="form-label">Day</label><input class="form-control review-date" type="date" value="${esc(x.date||todayISO())}"></div><div><label class="form-label">Time</label><input class="form-control review-time" type="time" value="${esc(x.time||'')}"></div><div><label class="form-label">Part of day</label><input class="form-control review-part" value="${esc(x.partOfDay||partOfDay(x.time))}" readonly></div></div>`).join('');
  $$('.review-time').forEach(i=>i.oninput=()=>{i.closest('.activity-review-row').querySelector('.review-part').value=partOfDay(i.value)}); showModal('#activityReviewModal');
}
async function saveActivityReview(e){ e.preventDefault(); for(const row of $$('#activityReviewList [data-review-id]')){ const x=store.getById('activityLogs',row.dataset.reviewId); if(!x)continue; const time=row.querySelector('.review-time').value; await store.upsert('activityLogs',{...x,date:row.querySelector('.review-date').value,time,partOfDay:partOfDay(time),needsReview:false,updatedAt:Date.now()}); } closeModal('#activityReviewModal'); toast('Activity history updated'); scheduleAutoPlan('activity-review'); }
function openDailyBlock(){ $('#dailyBlockForm').reset(); $('#dailyBlockId').value=''; $('#dailyBlockDate').value=selectedISO(); showModal('#dailyBlockModal'); }
async function saveDailyBlock(e){ e.preventDefault(); const type=$('#dailyBlockType').value,date=$('#dailyBlockDate').value,start=$('#dailyBlockStart').value,end=$('#dailyBlockEnd').value,title=$('#dailyBlockTitle').value.trim()||type[0].toUpperCase()+type.slice(1),durationMinutes=minutesBetween(start,end); const block={id:uid(),type,title,date,startTime:start,endTime:end,durationMinutes,partOfDay:partOfDay(start),quality:$('#dailyBlockQuality').value,notes:$('#dailyBlockNotes').value.trim(),createdAt:Date.now(),updatedAt:Date.now()}; await store.upsert('dailyBlocks',block); await recordActivity({type,title,sourceCollection:'dailyBlocks',sourceId:block.id,date,time:start,endTime:end,durationMinutes,needsReview:false}); closeModal('#dailyBlockModal'); toast(`${title} logged`); scheduleAutoPlan(type); }
function renderActivityStats(){ const logs=store.data.activityLogs||[], recent=logs.filter(x=>Date.now()-Number(x.createdAt||0)<30*86400000),stats=activityStats(recent), topPart=Object.entries(stats.byPart).sort((a,b)=>b[1]-a[1])[0]; $('#activityStats').innerHTML=`<div class="activity-stat"><strong>${stats.count}</strong><small>actions · 30 days</small></div><div class="activity-stat"><strong>${Math.round(stats.minutes/60)}h</strong><small>tracked time</small></div><div class="activity-stat"><strong>${esc(topPart?.[0]||'—')}</strong><small>most active period</small></div><div class="activity-stat"><strong>${pendingActivity().length}</strong><small>times to confirm</small></div>`; }
function renderHabitIntelligence(){
  const c=$('#habitList'),logs=(store.data.activityLogs||[]).filter(x=>!x.needsReview),groups={}; logs.forEach(x=>{const k=(x.title||x.type).toLowerCase();(groups[k]??={title:x.title||x.type,count:0,parts:{},days:new Set()});const g=groups[k];g.count++;g.parts[x.partOfDay]=(g.parts[x.partOfDay]||0)+1;g.days.add(x.date)}); const auto=Object.values(groups).filter(x=>x.count>=2).sort((a,b)=>b.count-a.count).slice(0,6);
  const manual=(store.data.habits||[]).slice(0,4).map(x=>`<div class="rich-item" data-view-item="habit:${x.id}"><span><strong>${esc(x.title)}</strong><small>${esc(x.frequency||'Habit')}</small></span></div>`).join('');
  const patterns=auto.map(x=>{const part=Object.entries(x.parts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'varied';return `<div class="pattern-chip"><strong>${esc(x.title)}</strong><small>${x.count} times · ${x.days.size} days · usually ${esc(part)}</small></div>`}).join(''); c.innerHTML=manual+(patterns?`<div class="pattern-list">${patterns}</div>`:'<p class="muted">Complete and time a few activities to discover patterns automatically.</p>'); bindViewItems();
}
function reminderItems(){ const date=selectedISO(),tasks=taskOccurrencesForDate(store.data.tasks||[],date).filter(x=>!x.completed).map(x=>({kind:'task',title:x.title,sub:x.startTime?`${fmtTime(x.startTime)} · ${x.priority}`:`${x.priority} priority`,id:x.id})); const blocks=(store.data.dailyBlocks||[]).filter(x=>x.date===date).map(x=>({kind:'block',title:x.title,sub:`${fmtTime(x.startTime)}${x.endTime?` – ${fmtTime(x.endTime)}`:''} · ${x.type}`,id:x.id})); const plan=(store.data.dayPlans||[]).find(x=>x.date===date); const ai=plan?[{kind:'plan',title:'AI day plan',sub:plan.summary||'Your plan is ready',id:plan.id}]:[]; return [...ai,...blocks,...tasks].slice(0,12); }
function renderReminders(){ const items=reminderItems(),box=$('#reminderCarousel'),dots=$('#reminderDots'); if(!items.length){box.innerHTML='<div class="empty-state compact-empty"><p>No reminders yet. Add a task or daily activity.</p></div>';dots.innerHTML='';return;} state.reminderIndex=Math.min(state.reminderIndex,items.length-1); const x=items[state.reminderIndex]; box.innerHTML=`<div class="reminder-card" data-reminder-kind="${x.kind}" data-reminder-id="${x.id}"><span class="eyebrow">${esc(x.kind.toUpperCase())}</span><strong>${esc(x.title)}</strong><small>${esc(x.sub)}</small></div>`; dots.innerHTML=items.map((_,i)=>`<i class="${i===state.reminderIndex?'active':''}"></i>`).join(''); box.querySelector('.reminder-card').onclick=()=>{if(x.kind==='task')viewTask(store.getById('tasks',x.id)); if(x.kind==='plan')openDayPlan(x.id)}; clearInterval(state.reminderTimer); state.reminderTimer=setInterval(()=>{state.reminderIndex=(state.reminderIndex+1)%items.length;renderReminders()},9000); }
function openDayPlan(id){ const p=store.getById('dayPlans',id); if(!p)return; $('#viewEyebrow').textContent='AI DAY PLAN';$('#viewTitle').textContent=p.date;$('#viewBody').innerHTML=`<div class="detail-card"><pre class="ai-step">${esc(typeof p.plan==='string'?p.plan:JSON.stringify(p.plan,null,2))}</pre></div>`;$('#viewFooter').innerHTML='';showModal('#viewModal'); }
async function buildAutoDayPlan(reason='daily'){ const date=todayISO(),tasks=taskOccurrencesForDate(store.data.tasks||[],date).filter(t=>!t.completed),blocks=(store.data.dailyBlocks||[]).filter(x=>x.date===date),recent=(store.data.activityLogs||[]).filter(x=>Date.now()-Number(x.createdAt||0)<14*86400000&&!x.needsReview).slice(-80); if(!tasks.length&&!blocks.length)return; try{const r=await fetch(`${API_BASE_URL}/plan-day`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,tasks,blocks,recentActivity:recent,reason})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Plan failed');const old=(store.data.dayPlans||[]).find(x=>x.date===date);await store.upsert('dayPlans',{id:old?.id||`plan-${date}`,date,plan:d.plan,summary:'Updated from today’s tasks and tracked activity',reason,updatedAt:Date.now(),createdAt:old?.createdAt||Date.now()});}catch(err){console.warn('Auto day plan unavailable',err)}}
function scheduleAutoPlan(reason){ if(!settings.autoDayPlan)return; const key='cc-last-auto-plan',last=Number(localStorage.getItem(key)||0); if(Date.now()-last<10*60*1000)return; localStorage.setItem(key,String(Date.now())); setTimeout(()=>buildAutoDayPlan(reason),700); }
function renderTaskSuggestions(){ const input=$('#taskTitle'),box=$('#taskSuggestions'); const rows=suggestionsFor(input.value,store); if(!rows.length){box.classList.add('d-none');box.innerHTML='';return;} box.innerHTML=rows.map(x=>`<button type="button" class="typeahead-item" data-suggest-title="${esc(x.title)}"><strong>${esc(x.title)}</strong><small>Done/used ${x.count} times</small></button>`).join('');box.classList.remove('d-none');$$('[data-suggest-title]').forEach(b=>b.onclick=()=>{input.value=b.dataset.suggestTitle;box.classList.add('d-none')}); }

function completionForGoal(goal){
  const linked=(store.data.tasks||[]).filter(t=>t.goalId===goal.id);
  if(!linked.length) return Number(goal.manualProgress)||0;
  let total=0,done=0; const now=todayISO();
  linked.forEach(t=>{
    if(t.frequency && t.frequency!=='Once'){
      const start=parse(t.date), end=parse([t.frequencyEndDate||now,now].sort()[0]);
      if(!start || Number.isNaN(start.getTime())) return;
      for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){ const di=iso(d); if(occursOn(t,di)){ total++; if(isOccurrenceComplete(t,di)) done++; } }
    } else { total++; if(t.completed) done++; }
  });
  return total ? Math.round(done/total*100) : Number(goal.manualProgress)||0;
}
function savingsForGoal(goalId){
  return (store.data.savings||[]).filter(s=>s.goalId===goalId).reduce((sum,s)=>sum+savingsTotal(s),0);
}
function savingsTotal(s){ return Number(s.startingAmount||0)+(s.transactions||[]).reduce((a,t)=>a+Number(t.amount||0),0); }
function goalTarget(goal){ return Number(goal?.targetAmount||0); }

function render(){
  renderHeader(); renderRollover(); renderWeek(); renderTasks(); renderTimeline(); renderGoals(); renderProjects(); renderHabits(); renderNotes(); renderShopping(); renderWorkouts(); renderSavings(); renderGalleryWidget(); renderStats(); renderActivityStats(); renderReminders();
}
function renderHeader(){
  $('#pageTitle').textContent=state.selectedDate.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
  $('#focusDate').textContent=state.selectedDate.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const firebase=store.mode==='firebase';
  $('#syncText').textContent=firebase?(store.realtimeReady?'Live sync connected':'Connecting live sync…'):'Local demo mode';
  $('#syncDot').classList.toggle('online',firebase && store.realtimeReady);
}
function renderRollover(){
  const box=$('#rolloverAlert'),list=$('#rolloverList'); if(!box||!list)return;
  const today=todayISO(); const overdue=(store.data.tasks||[]).filter(t=>t.date<today&&!t.completed&&(!t.frequency||t.frequency==='Once'));
  box.classList.toggle('d-none',!overdue.length); if(!overdue.length)return;
  list.innerHTML=overdue.slice(0,6).map(t=>`<div class="rollover-item"><span><strong>${esc(t.title)}</strong><small>Due ${esc(t.date)}</small></span><button class="btn btn-sm btn-outline-light" data-roll="${t.id}">Move to today</button></div>`).join('');
  $$('[data-roll]').forEach(b=>b.onclick=async()=>{ const t=store.getById('tasks',b.dataset.roll); if(t){ await store.upsert('tasks',{...t,date:today,updatedAt:Date.now()}); toast('Task moved to today'); } });
}
function renderWeek(){
  const c=$('#weekStrip'); const d=new Date(state.selectedDate); d.setDate(d.getDate()-((d.getDay()+6)%7));
  c.innerHTML=Array.from({length:7},(_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); const di=iso(x),ts=taskOccurrencesForDate(store.data.tasks,di),done=ts.filter(t=>t.completed).length; return `<button class="day-card ${di===selectedISO()?'selected':''}" data-date="${di}"><strong>${x.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</strong><span>${x.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><span>${done}/${ts.length} done</span><div class="day-progress"><i style="width:${ts.length?done/ts.length*100:0}%"></i></div></button>`; }).join('');
  $$('.day-card').forEach(b=>b.onclick=()=>{ state.selectedDate=parse(b.dataset.date); render(); });
}
function filteredToday(){
  return taskForDate().filter(t=>{
    if(!settings.showCompleted && t.completed) return false;
    const p=(t.priority||'').toLowerCase();
    const f=state.filter==='all'||(state.filter==='completed'?t.completed:p===state.filter);
    const s=!state.search||`${t.title} ${t.category} ${t.notes||''}`.toLowerCase().includes(state.search);
    return f&&s;
  }).sort((a,b)=>Number(a.completed)-Number(b.completed)||(a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
}
function taskMeta(t){
  const bits=[t.category||'Personal'];
  if(t.goalId) bits.push(`🎯 ${goalById(t.goalId)?.title||'Goal'}`);
  if(t.projectId) bits.push(`📁 ${projectById(t.projectId)?.title||'Project'}`);
  if(t.frequency&&t.frequency!=='Once') bits.push(`↻ ${recurrenceLabel(t)}`);
  return bits.join(' · ');
}
function renderTasks(){
  const all=taskForDate(),list=filteredToday();
  ['All','High','Medium','Low'].forEach(k=>{ const e=$(`#count${k}`); if(e)e.textContent=k==='All'?all.length:all.filter(t=>t.priority===k).length; });
  $('#countDone').textContent=all.filter(t=>t.completed).length;
  $('#taskList').innerHTML=list.map(t=>`<div class="task-row" data-view-task="${t.id}"><input class="task-check" type="checkbox" ${t.completed?'checked':''} aria-label="Complete task"><div class="task-copy"><span class="task-title ${t.completed?'done':''}">${esc(t.title)}</span><small>${esc(taskMeta(t))}</small></div><span class="badge-soft priority-${(t.priority||'Medium').toLowerCase()}">${esc(t.priority||'Medium')}</span><span>${t.startTime?esc(fmtTime(t.startTime)):''}</span><button class="task-menu" data-edit-task="${t.id}" title="Edit"><i class="bi bi-three-dots-vertical"></i></button></div>`).join('');
  $('#emptyTasks').classList.toggle('d-none',!!list.length);
  $$('.task-row').forEach(r=>{
    const t=store.getById('tasks',r.dataset.viewTask);
    r.onclick=e=>{ if(e.target.closest('input,button,a'))return; viewTask(t); };
    r.querySelector('.task-check').onchange=async e=>{ e.stopPropagation(); await setTaskComplete(t,e.target.checked,selectedISO()); };
  });
  $$('[data-edit-task]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openTask(store.getById('tasks',b.dataset.editTask)); });
}
function renderTimeline(){
  const list=taskForDate().filter(t=>t.startTime&&!t.completed).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  $('#timeline').innerHTML=list.length?list.map(t=>`<button class="time-block timeline-task" data-view-task="${t.id}"><div class="time-label">${fmtTime(t.startTime)}</div><div class="task ${(t.priority||'Medium').toLowerCase()}"><strong>${esc(t.title)}</strong><br><small>${t.estimatedMinutes||30} min · ${esc(taskMeta(t))}</small></div></button>`).join(''):`<div class="empty-state compact-empty"><i class="bi bi-calendar2-check"></i><p>No scheduled tasks.</p></div>`;
  $$('.timeline-task').forEach(b=>b.onclick=()=>viewTask(store.getById('tasks',b.dataset.viewTask)));
}
function renderStats(){
  const start=new Date(state.selectedDate); start.setDate(start.getDate()-((start.getDay()+6)%7)); let total=0,done=0,high=0;
  for(let i=0;i<7;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const ts=taskOccurrencesForDate(store.data.tasks,iso(d)); total+=ts.length; done+=ts.filter(t=>t.completed).length; high+=ts.filter(t=>!t.completed&&t.priority==='High').length; }
  const p=total?Math.round(done/total*100):0; $('#progressPercent').textContent=`${p}%`; $('#progressBar').style.width=`${p}%`; $('#doneStat').textContent=done; $('#openStat').textContent=total-done; $('#highStat').textContent=high;
}
function renderGoals(){
  const c=$('#goalList'); c.innerHTML=(store.data.goals||[]).slice(0,8).map(g=>{ const p=completionForGoal(g), saved=savingsForGoal(g.id), target=goalTarget(g); return `<div class="rich-item" data-view-item="goal:${g.id}"><span><strong>${esc(g.title)}</strong><small>${g.targetDate?`Deadline ${esc(g.targetDate)} · `:''}${p}% task progress${target?` · ${money(saved)} / ${money(target)}`:''}</small>${g.details?`<small class="linkified">${linkify(g.details.slice(0,150))}</small>`:''}</span><span class="mini-progress"><i style="width:${Math.min(100,target?saved/target*100:p)}%"></i></span></div>`; }).join('')||'<p class="muted">No goals yet.</p>';
  bindViewItems();
}
function renderProjects(){
  const c=$('#projectList'); c.innerHTML=(store.data.projects||[]).slice(0,8).map(p=>{ const tasks=(store.data.tasks||[]).filter(t=>t.projectId===p.id),done=tasks.filter(t=>t.completed).length; return `<div class="rich-item" data-view-item="project:${p.id}"><span><strong>${esc(p.title)}</strong><small>${done}/${tasks.length} linked tasks complete</small>${p.details?`<small class="linkified">${linkify(p.details.slice(0,150))}</small>`:''}</span></div>`; }).join('')||'<p class="muted">No projects yet.</p>';
  bindViewItems();
}
function renderHabits(){ renderHabitIntelligence(); }
function renderNotes(){
  const c=$('#notesList'); c.innerHTML=(store.data.notes||[]).slice(0,7).map(n=>`<div class="note-item" data-view-item="note:${n.id}"><i class="bi bi-lightbulb"></i><span><strong>${esc(n.title)}</strong><small class="linkified">${linkify((n.details||'').slice(0,220))}</small></span></div>`).join('')||'<p class="muted">Capture an idea and let AI turn it into action.</p>'; bindViewItems();
}
function renderSimple(collection,selector,type){
  const c=$(selector); c.innerHTML=(store.data[collection]||[]).slice(0,8).map(x=>`<div class="rich-item" data-view-item="${type}:${x.id}"><span><strong>${esc(x.title)}</strong><small class="linkified">${linkify((x.details||x.frequency||'').slice(0,160))}</small></span></div>`).join('')||'<p class="muted">Nothing here yet.</p>'; bindViewItems();
}
function renderShopping(){
  const rows=store.data.shopping||[]; const c=$('#shoppingList');
  c.innerHTML=rows.slice(0,10).map(x=>{ const total=Number(x.cost||0)*Number(x.quantity||1); const links=[x.goalId?`🎯 ${goalById(x.goalId)?.title||'Goal'}`:'',x.projectId?`📁 ${projectById(x.projectId)?.title||'Project'}`:''].filter(Boolean).join(' · '); return `<div class="rich-item" data-view-item="shopping:${x.id}"><span><strong>${x.purchased?'✓ ':''}${esc(x.title)}</strong><small>${x.quantity||1} × ${money(x.cost||0)} = ${money(total)}${links?` · ${esc(links)}`:''}</small>${x.details?`<small class="linkified">${linkify(x.details.slice(0,140))}</small>`:''}</span></div>`; }).join('')||'<p class="muted">Nothing on the shopping list.</p>';
  const planned=rows.filter(x=>!x.purchased).reduce((s,x)=>s+Number(x.cost||0)*Number(x.quantity||1),0); $('#shoppingTotal').textContent=`Open shopping total: ${money(planned)}`; bindViewItems();
}
function renderWorkouts(){
  const c=$('#workoutList'); c.innerHTML=(store.data.workouts||[]).slice(0,7).map(w=>`<div class="rich-item" data-view-item="workout:${w.id}"><span><strong>${esc(w.title)}</strong><small>${esc(w.schedule||'Any day')} · ${(w.exercises||[]).length} exercises · ${w.targetMinutes||60} min</small></span></div>`).join('')||'<p class="muted">Add your first workout routine.</p>'; bindViewItems();
}
function renderSavings(){
  const c=$('#savingsList'); const rows=store.data.savings||[];
  c.innerHTML=rows.slice(0,8).map(s=>{ const current=savingsTotal(s); const goal=goalById(s.goalId); const target=Number(s.targetAmount||goal?.targetAmount||0); const pct=target?Math.min(100,Math.round(current/target*100)):0; return `<div class="savings-card" data-view-item="savings:${s.id}"><div class="d-flex justify-content-between gap-2"><span><strong>${esc(s.title)}</strong><small class="d-block muted">${goal?`Goal: ${esc(goal.title)}`:'Standalone fund'}</small></span><span class="money">${money(current)}</span></div><div class="progress mt-2"><div class="progress-bar" style="width:${pct}%"></div></div><small>${target?`${pct}% of ${money(target)}`:'No target set'}</small></div>`; }).join('')||'<p class="muted">Create a savings tracker and link it to a goal.</p>'; bindViewItems();
}

function allTaskPictures(){
  return (store.data.tasks||[]).flatMap(task=>(task.attachments||[]).filter(a=>String(a.type||'').startsWith('image/')).map(a=>({...a,taskId:task.id,taskTitle:task.title}))).sort((a,b)=>Number(b.featured)-Number(a.featured));
}
function galleryPictures(){ const all=allTaskPictures(); const featured=all.filter(x=>x.featured); return featured.length?featured:all; }
function renderGalleryWidget(){
  const pics=galleryPictures().slice(0,6); const c=$('#galleryWidget'); c.innerHTML=pics.length?pics.map((p,i)=>`<button data-gallery-index="${i}" title="${esc(p.taskTitle)}"><img src="${esc(p.url)}" alt="${esc(p.name||p.taskTitle)}"></button>`).join(''):'<p class="muted">Upload pictures to tasks, then mark favorites for this board.</p>';
  $$('[data-gallery-index]').forEach(b=>b.onclick=()=>openGallery(Number(b.dataset.galleryIndex)));
}
function openGallery(index=0){ state.galleryIndex=index; renderGalleryModal(); showModal('#galleryModal'); }
function renderGalleryModal(){
  const pics=galleryPictures(); if(!pics.length){ $('#galleryHero').innerHTML='<p class="muted">No task pictures yet.</p>'; $('#galleryThumbs').innerHTML=''; return; }
  state.galleryIndex=Math.max(0,Math.min(state.galleryIndex,pics.length-1)); const p=pics[state.galleryIndex];
  $('#galleryHero').innerHTML=`<button class="gallery-main-button" data-gallery-task="${p.taskId}"><img src="${esc(p.url)}" alt="${esc(p.name||p.taskTitle)}"><div class="gallery-caption"><strong>${esc(p.taskTitle)}</strong><small class="d-block">Click picture to open linked task</small></div></button>`;
  $('#galleryThumbs').innerHTML=pics.map((x,i)=>`<button data-gallery-thumb="${i}" class="${i===state.galleryIndex?'active':''}"><img src="${esc(x.url)}" alt="${esc(x.name||x.taskTitle)}"></button>`).join('');
  $('[data-gallery-task]')?.addEventListener('click',()=>{ closeModal('#galleryModal'); setTimeout(()=>viewTask(store.getById('tasks',p.taskId)),220); });
  $$('[data-gallery-thumb]').forEach(b=>b.onclick=()=>{state.galleryIndex=Number(b.dataset.galleryThumb);renderGalleryModal();});
}
function startSlideshow(){ clearInterval(state.slideshowTimer); if(!settings.slideshow)return; state.slideshowTimer=setInterval(()=>{ const pics=galleryPictures(); if(pics.length<2)return; state.galleryIndex=(state.galleryIndex+1)%pics.length; if($('#galleryModal')?.classList.contains('show')) renderGalleryModal(); },6000); }

function bindViewItems(){
  $$('[data-view-item]').forEach(el=>{ if(el.dataset.bound)return; el.dataset.bound='1'; el.addEventListener('click',e=>{ if(e.target.closest('a'))return; const [type,id]=el.dataset.viewItem.split(':'); openView(type,id); }); });
}
function relatedFor(type,id){
  return {
    tasks:(store.data.tasks||[]).filter(t=>(type==='goal'&&t.goalId===id)||(type==='project'&&t.projectId===id)),
    shopping:(store.data.shopping||[]).filter(x=>(type==='goal'&&x.goalId===id)||(type==='project'&&x.projectId===id)),
    savings:(store.data.savings||[]).filter(x=>type==='goal'&&x.goalId===id),
    workouts:(store.data.workouts||[]).filter(x=>type==='goal'&&x.goalId===id),
  };
}
function detailList(title,rows,type){
  if(!rows?.length)return '';
  return `<div class="detail-card"><h4>${esc(title)}</h4><div class="detail-list">${rows.map(x=>`<button class="rich-item" data-detail-open="${type}:${x.id}"><span><strong>${esc(x.title)}</strong><small>${type==='tasks'?(x.completed?'Completed':'Open'):''}</small></span></button>`).join('')}</div></div>`;
}
function openView(type,id){
  if(type==='task'||type==='tasks') return viewTask(store.getById('tasks',id));
  const collection=type==='habit'?'habits':type==='note'?'notes':type==='shopping'?'shopping':type==='workout'?'workouts':type==='goal'?'goals':type==='project'?'projects':type==='savings'?'savings':type;
  const item=store.getById(collection,id); if(!item)return;
  $('#viewEyebrow').textContent=type.toUpperCase(); $('#viewTitle').textContent=item.title||'Details';
  let body=''; let footer='';

  if(type==='goal'){
    const rel=relatedFor('goal',id),p=completionForGoal(item),saved=savingsForGoal(id),target=goalTarget(item);
    body=`<div class="detail-grid"><div class="detail-card"><h4>Goal overview</h4><p>${item.targetDate?`Deadline: <strong>${esc(fmtDate(item.targetDate))}</strong><br>`:''}Task progress: <strong>${p}%</strong>${target?`<br>Savings: <strong>${money(saved)} / ${money(target)}</strong>`:''}</p><div class="linkified">${linkify(item.details||'No details.')}</div></div>${detailList('Linked tasks',rel.tasks,'tasks')}${detailList('Linked shopping',rel.shopping,'shopping')}${detailList('Savings trackers',rel.savings,'savings')}${detailList('Workout routines',rel.workouts,'workout')}</div>`;
    footer=`<button class="btn btn-outline-light" data-edit-view="goal:${id}"><i class="bi bi-pencil"></i> Edit goal</button>`;
  } else if(type==='project'){
    const rel=relatedFor('project',id),done=rel.tasks.filter(t=>t.completed).length;
    body=`<div class="detail-grid"><div class="detail-card"><h4>Project overview</h4><p><strong>${done}/${rel.tasks.length}</strong> linked tasks complete.</p><div class="linkified">${linkify(item.details||'No details.')}</div></div>${detailList('Linked tasks',rel.tasks,'tasks')}${detailList('Linked shopping',rel.shopping,'shopping')}</div>`;
    footer=`<button class="btn btn-outline-light" data-edit-view="project:${id}"><i class="bi bi-pencil"></i> Edit project</button><button class="btn btn-neon" data-new-project-task="${id}"><i class="bi bi-plus"></i> Linked task</button>`;
  } else if(type==='workout'){
    const exercises=item.exercises||[];
    body=`<div class="detail-grid"><div class="detail-card"><h4>Routine</h4><p>${esc(item.schedule||'Any day')} · ${item.targetMinutes||60} min${item.goalId?` · Goal: ${esc(goalById(item.goalId)?.title||'')}`:''}</p><div class="linkified">${linkify(item.notes||'')}</div></div><div class="detail-card"><h4>Exercises</h4><div class="detail-list">${exercises.map((x,i)=>`<div class="workout-exercise"><strong>${i+1}. ${esc(x.name)}</strong><small>${esc(x.sets||'')} sets · ${esc(x.reps||'')} reps${x.weight?` · ${esc(x.weight)} weight`:''}${x.restSeconds?` · ${esc(x.restSeconds)}s rest`:''}</small>${x.notes?`<div class="linkified mt-1">${linkify(x.notes)}</div>`:''}</div>`).join('')||'<p class="muted">No exercises added.</p>'}</div></div></div>`;
    footer=`<button class="btn btn-outline-light" data-edit-workout="${id}"><i class="bi bi-pencil"></i> Edit routine</button><button class="btn btn-success" data-log-workout="${id}"><i class="bi bi-check2"></i> Log workout</button>`;
  } else if(type==='savings'){
    const current=savingsTotal(item),goal=goalById(item.goalId),target=Number(item.targetAmount||goal?.targetAmount||0),pct=target?Math.round(current/target*100):0;
    body=`<div class="detail-card"><h4>Savings progress</h4><div class="money fs-2 fw-bold">${money(current)}</div><p>${target?`${pct}% of ${money(target)} · ${money(Math.max(0,target-current))} remaining`:'No target set'}${goal?`<br>Linked goal: ${esc(goal.title)}`:''}</p><div class="progress"><div class="progress-bar" style="width:${Math.min(100,pct)}%"></div></div><div class="linkified mt-3">${linkify(item.note||'')}</div><div class="savings-history">${(item.transactions||[]).slice().reverse().map(t=>`<div><span>${esc(t.date||'')}</span><strong>+${money(t.amount)}</strong></div>`).join('')}</div></div>`;
    footer=`<button class="btn btn-neon" data-edit-savings="${id}"><i class="bi bi-plus-circle"></i> Add / edit savings</button>`;
  } else if(type==='shopping'){
    body=`<div class="detail-card"><h4>Shopping item</h4><p>Quantity: ${item.quantity||1}<br>Cost each: ${money(item.cost||0)}<br>Total: <strong>${money(Number(item.cost||0)*Number(item.quantity||1))}</strong><br>Status: ${item.purchased?'Purchased':'Open'}${item.goalId?`<br>Goal: ${esc(goalById(item.goalId)?.title||'')}`:''}${item.projectId?`<br>Project: ${esc(projectById(item.projectId)?.title||'')}`:''}</p><div class="linkified">${linkify(item.details||'')}</div></div>`;
    footer=`<button class="btn btn-outline-light" data-edit-view="shopping:${id}"><i class="bi bi-pencil"></i> Edit item</button>`;
  } else {
    body=`<div class="detail-card"><div class="linkified">${linkify(item.details||item.frequency||'No details.')}</div></div>`;
    footer=`<button class="btn btn-outline-light" data-edit-view="${type}:${id}"><i class="bi bi-pencil"></i> Edit</button>`;
  }

  $('#viewBody').innerHTML=body; $('#viewFooter').innerHTML=footer; bindViewModalActions(); showModal('#viewModal');
}
function viewTask(task){
  if(!task)return;
  $('#viewEyebrow').textContent='TASK'; $('#viewTitle').textContent=task.title;
  const goal=goalById(task.goalId),project=projectById(task.projectId),attachments=task.attachments||[];
  $('#viewBody').innerHTML=`<div class="detail-grid"><div class="detail-card"><h4>Task details</h4><p>${task.date?`Date: <strong>${esc(fmtDate(task.occurrenceDate||task.date))}</strong><br>`:''}${task.startTime?`Time: <strong>${esc(fmtTime(task.startTime))}</strong><br>`:''}Priority: <strong>${esc(task.priority||'Medium')}</strong><br>Category: ${esc(task.category||'Personal')}<br>Duration: ${task.estimatedMinutes||30} min${task.frequency&&task.frequency!=='Once'?`<br>Repeats: ${esc(recurrenceLabel(task))}`:''}</p>${goal?`<p>🎯 Goal: <button class="link-button" data-detail-open="goal:${goal.id}">${esc(goal.title)}</button></p>`:''}${project?`<p>📁 Project: <button class="link-button" data-detail-open="project:${project.id}">${esc(project.title)}</button></p>`:''}<div class="linkified">${linkify(task.notes||'No notes.')}</div></div><div class="detail-card"><h4>Pictures & attachments</h4><div class="attachment-grid">${attachments.length?attachments.map((a,i)=>String(a.type||'').startsWith('image/')?`<div class="attachment-card"><img src="${esc(a.url)}" alt="${esc(a.name)}"><button class="featured-toggle" data-feature-picture="${i}" title="Show on Picture Board"><i class="bi ${a.featured?'bi-star-fill':'bi-star'}"></i></button><div class="attachment-meta"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a></div></div>`:`<div class="attachment-card"><div class="attachment-meta"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a></div></div>`).join(''):'<p class="muted">No attachments.</p>'}</div></div></div>`;
  $('#viewFooter').innerHTML=`<button class="btn btn-outline-light" data-edit-task-view="${task.id}"><i class="bi bi-pencil"></i> Edit</button><button class="btn ${task.completed?'btn-outline-warning':'btn-success'}" data-complete-task-view="${task.id}"><i class="bi ${task.completed?'bi-arrow-counterclockwise':'bi-check2'}"></i> ${task.completed?'Mark open':'Complete'}</button>`;
  bindViewModalActions(task); showModal('#viewModal');
}
function bindViewModalActions(task=null){
  $$('[data-detail-open]').forEach(b=>b.onclick=()=>{ const [type,id]=b.dataset.detailOpen.split(':'); openView(type,id); });
  $('[data-edit-task-view]')?.addEventListener('click',()=>{ const t=store.getById('tasks',$('[data-edit-task-view]').dataset.editTaskView); closeModal('#viewModal'); setTimeout(()=>openTask(t),220); });
  $('[data-complete-task-view]')?.addEventListener('click',async()=>{ const t=store.getById('tasks',$('[data-complete-task-view]').dataset.completeTaskView); await setTaskComplete(t,!t.completed,t.occurrenceDate||selectedISO()); closeModal('#viewModal'); });
  $$('[data-feature-picture]').forEach(b=>b.onclick=async()=>{ if(!task)return; const index=Number(b.dataset.featurePicture); const attachments=(task.attachments||[]).map((a,i)=>i===index?{...a,featured:!a.featured}:a); await store.upsert('tasks',{...task,attachments,updatedAt:Date.now()}); viewTask(store.getById('tasks',task.id)); });
  $('[data-edit-view]')?.addEventListener('click',()=>{ const [type,id]=$('[data-edit-view]').dataset.editView.split(':'); const col=type==='goal'?'goals':type==='project'?'projects':type==='shopping'?'shopping':type==='note'?'notes':type==='habit'?'habits':type; const item=store.getById(col,id); closeModal('#viewModal'); setTimeout(()=>openItem(type,item),220); });
  $('[data-edit-workout]')?.addEventListener('click',()=>{ const w=store.getById('workouts',$('[data-edit-workout]').dataset.editWorkout); closeModal('#viewModal'); setTimeout(()=>openWorkout(w),220); });
  $('[data-log-workout]')?.addEventListener('click',async()=>{const w=store.getById('workouts',$('[data-log-workout]').dataset.logWorkout);if(!w)return;const now=localNow();await recordActivity({type:'workout',title:w.title,sourceCollection:'workouts',sourceId:w.id,date:now.date,time:now.time,durationMinutes:w.targetMinutes||60,needsReview:true,meta:{goalId:w.goalId||''}});closeModal('#viewModal');maybeReviewActivity();scheduleAutoPlan('workout-completed');toast('Workout logged');});
  $('[data-edit-savings]')?.addEventListener('click',()=>{ const s=store.getById('savings',$('[data-edit-savings]').dataset.editSavings); closeModal('#viewModal'); setTimeout(()=>openSavings(s),220); });
  $('[data-new-project-task]')?.addEventListener('click',()=>{ const projectId=$('[data-new-project-task]').dataset.newProjectTask; closeModal('#viewModal'); setTimeout(()=>openTask(null,selectedISO(),{projectId}),220); });
}
async function setTaskComplete(t,checked,dateISO){
  if(!t)return;
  if(t.frequency&&t.frequency!=='Once'){
    const set=new Set(t.completedDates||[]); checked?set.add(dateISO):set.delete(dateISO); await store.upsert('tasks',{...t,completedDates:[...set],updatedAt:Date.now()});
  } else await store.upsert('tasks',{...t,completed:checked,updatedAt:Date.now()});
  if(checked){ const now=localNow(); await recordActivity({type:'task',title:t.title,sourceCollection:'tasks',sourceId:t.id,date:dateISO||now.date,time:now.time,needsReview:true,meta:{category:t.category||'',projectId:t.projectId||'',goalId:t.goalId||''}}); maybeReviewActivity(); scheduleAutoPlan('task-completed'); }
  toast(checked?'Task completed':'Task reopened');
}

function fillRelations(){
  $('#taskGoal').innerHTML=optionList(store.data.goals,'No linked goal',$('#taskGoal').value);
  $('#taskProject').innerHTML=optionList(store.data.projects,'No linked project',$('#taskProject').value);
  $('#itemGoal').innerHTML=optionList(store.data.goals,'No linked goal',$('#itemGoal').value);
  $('#itemProject').innerHTML=optionList(store.data.projects,'No linked project',$('#itemProject').value);
  $('#workoutGoal').innerHTML=optionList(store.data.goals,'No linked goal',$('#workoutGoal').value);
  $('#savingsGoal').innerHTML=optionList(store.data.goals,'No linked goal',$('#savingsGoal').value);
}
function frequencyUI(){ const f=$('#taskFrequency').value; $('#frequencyOptions').classList.toggle('d-none',f==='Once'); $('#weeklyDays').classList.toggle('d-none',f!=='Weekly'); }
function openTask(t=null,date=selectedISO(),defaults={}){
  fillRelations(); $('#taskForm').reset(); $('#taskId').value=t?.id||''; $('#taskTitle').value=t?.title||''; $('#taskDate').value=t?.date||date; $('#taskTime').value=t?.startTime||''; $('#taskDuration').value=t?.estimatedMinutes||30; $('#taskPriority').value=t?.priority||'Medium'; $('#taskCategory').value=t?.category||'Personal'; $('#taskGoal').value=t?.goalId||defaults.goalId||''; $('#taskProject').value=t?.projectId||defaults.projectId||''; $('#taskNotes').value=t?.notes||''; $('#taskFrequency').value=t?.frequency||'Once'; $('#taskFrequencyInterval').value=t?.frequencyInterval||1; $('#taskFrequencyEnd').value=t?.frequencyEndDate||''; $$('[name="frequencyDay"]').forEach(x=>x.checked=(t?.frequencyDays||[]).includes(Number(x.value))); $('#taskModalLabel').textContent=t?'Edit Task':'Add Task'; $('#deleteTaskBtn').classList.toggle('d-none',!t); $('#taskError').textContent=''; frequencyUI(); showModal('#taskModal');
}
async function saveTask(e){
  e.preventDefault(); const id=$('#taskId').value,old=id?store.getById('tasks',id):null,title=$('#taskTitle').value.trim(); if(!title)return $('#taskError').textContent='Task title is required.';
  try{
    let attachments=old?.attachments||[]; const files=[...$('#taskAttachment').files];
    for(const file of files) attachments.push(await store.uploadAttachment(file,'task-attachments'));
    const item={...old,id:id||uid(),title,date:$('#taskDate').value,startTime:$('#taskTime').value,estimatedMinutes:Number($('#taskDuration').value)||30,priority:$('#taskPriority').value,category:$('#taskCategory').value,goalId:$('#taskGoal').value,projectId:$('#taskProject').value,notes:$('#taskNotes').value.trim(),frequency:$('#taskFrequency').value,frequencyInterval:Number($('#taskFrequencyInterval').value)||1,frequencyDays:$$('[name="frequencyDay"]:checked').map(x=>Number(x.value)),frequencyEndDate:$('#taskFrequencyEnd').value,completed:old?.completed||false,completedDates:old?.completedDates||[],attachments,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
    await store.upsert('tasks',item); closeModal('#taskModal'); toast(old?'Task updated':'Task added');
  }catch(err){ console.error(err); $('#taskError').textContent=err.message||'Unable to save task.'; }
}
function deleteTask(){ const t=store.getById('tasks',$('#taskId').value); if(!t)return; closeModal('#taskModal'); setTimeout(()=>requestDelete({type:'tasks',id:t.id,title:t.title,afterDelete:render}),220); }

const itemConfig={note:['notes','Note'],habit:['habits','Habit'],goal:['goals','Goal'],project:['projects','Project'],shopping:['shopping','Shopping Item']};
function openItem(type,item=null){
  const [col,label]=itemConfig[type]; fillRelations(); $('#itemForm').reset(); $('#itemType').value=type; $('#itemId').value=item?.id||''; $('#itemTitle').value=item?.title||''; $('#itemDetails').value=item?.details||''; $('#itemDate').value=item?.targetDate||''; $('#itemGoalAmount').value=item?.targetAmount||''; $('#itemFrequency').value=item?.frequency||'Daily'; $('#itemQuantity').value=item?.quantity||1; $('#itemCost').value=item?.cost||''; $('#itemPurchased').value=String(Boolean(item?.purchased)); $('#itemGoal').value=item?.goalId||''; $('#itemProject').value=item?.projectId||''; $('#itemManualProgress').value=item?.manualProgress||0; $('#itemModalLabel').textContent=`${item?'Edit':'Add'} ${label}`; $('#itemDateGroup').classList.toggle('d-none',type!=='goal'); $('#itemGoalAmountGroup').classList.toggle('d-none',type!=='goal'); $('#itemProgressGroup').classList.toggle('d-none',type!=='goal'); $('#itemFrequencyGroup').classList.toggle('d-none',type!=='habit'); $('#itemQuantityGroup').classList.toggle('d-none',type!=='shopping'); $('#itemLinksGroup').classList.toggle('d-none',type!=='shopping'); $('#aiNoteGroup').classList.toggle('d-none',type!=='note'); $('#deleteItemBtn').classList.toggle('d-none',!item); $('#aiSuggestions').innerHTML=''; $('#itemError').textContent=''; showModal('#itemModal');
}
async function saveItem(e){
  e.preventDefault(); const type=$('#itemType').value,[col,label]=itemConfig[type],id=$('#itemId').value,old=id?store.getById(col,id):null,title=$('#itemTitle').value.trim(); if(!title)return $('#itemError').textContent='Title is required.';
  try{
    const item={...old,id:id||uid(),title,details:$('#itemDetails').value.trim(),targetDate:type==='goal'?$('#itemDate').value:'',targetAmount:type==='goal'?Number($('#itemGoalAmount').value)||0:old?.targetAmount||0,manualProgress:type==='goal'?Number($('#itemManualProgress').value)||0:0,frequency:type==='habit'?$('#itemFrequency').value:'',quantity:type==='shopping'?Number($('#itemQuantity').value)||1:null,cost:type==='shopping'?Number($('#itemCost').value)||0:null,purchased:type==='shopping'?$('#itemPurchased').value==='true':false,goalId:type==='shopping'?$('#itemGoal').value:'',projectId:type==='shopping'?$('#itemProject').value:'',createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
    await store.upsert(col,item); if(type==='shopping' && item.purchased && !old?.purchased){const now=localNow();await recordActivity({type:'shopping',title:item.title,sourceCollection:'shopping',sourceId:item.id,date:now.date,time:now.time,needsReview:true,meta:{cost:item.cost,quantity:item.quantity,projectId:item.projectId,goalId:item.goalId}});maybeReviewActivity();scheduleAutoPlan('shopping-completed');} closeModal('#itemModal'); toast(`${label} saved`);
  }catch(err){ $('#itemError').textContent=err.message||'Unable to save.'; }
}
function deleteItem(){ const type=$('#itemType').value,[col]=itemConfig[type],x=store.getById(col,$('#itemId').value); if(!x)return; closeModal('#itemModal'); setTimeout(()=>requestDelete({type:col,id:x.id,title:x.title,afterDelete:render}),220); }

async function analyzeNote(){
  const text=$('#itemDetails').value.trim(),title=$('#itemTitle').value.trim(); if(!text)return toast('Write the note first.'); const box=$('#aiSuggestions'); box.innerHTML='<div class="ai-step">Reasoning through your note…</div>';
  try{
    const r=await fetch(`${API_BASE_URL}/analyze-note`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,text})}); const data=await r.json(); if(!r.ok)throw new Error(data.error||`AI request failed: ${r.status}`);
    const actions=[...(data.tasks||[]).map(a=>({...a,type:'task',reason:a.details||a.reason||''})),...(data.projects||[]).map(a=>({...a,type:'project',reason:a.details||a.reason||''})),...(data.goals||[]).map(a=>({...a,type:'goal',reason:a.details||a.reason||''}))];
    box.innerHTML=actions.length?actions.map((a,i)=>`<label class="ai-suggestion d-flex gap-2 mb-2"><input type="checkbox" checked data-ai-index="${i}"><span><strong>${esc(a.title)}</strong><small class="d-block muted">${esc(a.type)} · ${esc(a.date||a.deadline||'No date')} · ${esc(a.reason||'')}</small></span></label>`).join('')+'<button id="createAiActions" class="btn btn-neon btn-sm mt-2" type="button">Create selected actions</button>':'<div class="ai-step">No action was needed.</div>';
    $('#createAiActions')?.addEventListener('click',()=>createAiActions(actions));
  }catch(err){ console.error(err); box.innerHTML=`<div class="ai-step">AI analysis failed: ${esc(err.message)}</div>`; }
}
async function createAiActions(actions){
  for(const cb of $$('[data-ai-index]:checked')){
    const a=actions[Number(cb.dataset.aiIndex)];
    if(a.type==='goal') await store.upsert('goals',{id:uid(),title:a.title,details:a.reason||'',targetDate:a.deadline||'',targetAmount:0,manualProgress:0,createdAt:Date.now(),updatedAt:Date.now()});
    else if(a.type==='project') await store.upsert('projects',{id:uid(),title:a.title,details:a.reason||'',createdAt:Date.now(),updatedAt:Date.now()});
    else await store.upsert('tasks',{id:uid(),title:a.title,date:a.date||todayISO(),startTime:a.startTime||'',estimatedMinutes:a.estimatedMinutes||30,priority:a.priority||'Medium',category:a.category||'Personal',notes:a.reason||'',goalId:'',projectId:'',frequency:a.frequency||'Once',frequencyInterval:1,frequencyDays:[],frequencyEndDate:'',completed:false,completedDates:[],attachments:[],createdAt:Date.now(),updatedAt:Date.now()});
  }
  toast('AI actions created'); $('#aiSuggestions').innerHTML='<div class="ai-step">Created. Review them on your dashboard.</div>';
}

function exerciseRow(x={}){ return `<div class="exercise-row"><div><label>Exercise</label><input class="form-control ex-name" value="${esc(x.name||'')}" placeholder="Chest press"></div><div><label>Sets</label><input class="form-control ex-sets" value="${esc(x.sets||'3')}" placeholder="3"></div><div><label>Reps</label><input class="form-control ex-reps" value="${esc(x.reps||'10')}" placeholder="10-12"></div><div><label>Weight</label><input class="form-control ex-weight" value="${esc(x.weight||'')}" placeholder="105 lb"></div><div><label>Rest / notes</label><input class="form-control ex-notes" value="${esc(x.notes||'')}" placeholder="60 sec rest"></div><button type="button" class="btn btn-outline-danger remove-exercise"><i class="bi bi-trash"></i></button></div>`; }
function bindExerciseRows(){ $$('.remove-exercise').forEach(b=>b.onclick=()=>b.closest('.exercise-row').remove()); }
function addExercise(x={}){ $('#exerciseRows').insertAdjacentHTML('beforeend',exerciseRow(x)); bindExerciseRows(); }
function openWorkout(w=null){
  fillRelations(); $('#workoutForm').reset(); $('#workoutId').value=w?.id||''; $('#workoutTitle').value=w?.title||''; $('#workoutSchedule').value=w?.schedule||''; $('#workoutMinutes').value=w?.targetMinutes||60; $('#workoutGoal').value=w?.goalId||''; $('#workoutNotes').value=w?.notes||''; $('#exerciseRows').innerHTML=''; (w?.exercises?.length?w.exercises:[{name:'',sets:'3',reps:'10-12'}]).forEach(addExercise); $('#deleteWorkoutBtn').classList.toggle('d-none',!w); showModal('#workoutModal');
}
async function saveWorkout(e){
  e.preventDefault(); const id=$('#workoutId').value,old=id?store.getById('workouts',id):null,title=$('#workoutTitle').value.trim(); if(!title)return;
  const exercises=$$('.exercise-row').map(row=>({name:row.querySelector('.ex-name').value.trim(),sets:row.querySelector('.ex-sets').value.trim(),reps:row.querySelector('.ex-reps').value.trim(),weight:row.querySelector('.ex-weight').value.trim(),notes:row.querySelector('.ex-notes').value.trim()})).filter(x=>x.name);
  await store.upsert('workouts',{...old,id:id||uid(),title,schedule:$('#workoutSchedule').value.trim(),targetMinutes:Number($('#workoutMinutes').value)||60,goalId:$('#workoutGoal').value,exercises,notes:$('#workoutNotes').value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()}); closeModal('#workoutModal'); toast('Workout saved');
}
function deleteWorkout(){ const x=store.getById('workouts',$('#workoutId').value); if(!x)return; closeModal('#workoutModal'); setTimeout(()=>requestDelete({type:'workouts',id:x.id,title:x.title,afterDelete:render}),220); }

function openSavings(s=null){
  fillRelations(); $('#savingsForm').reset(); $('#savingsId').value=s?.id||''; $('#savingsTitle').value=s?.title||''; $('#savingsGoal').value=s?.goalId||''; $('#savingsTarget').value=s?.targetAmount||''; $('#savingsStarting').value=s?.startingAmount||''; $('#savingsAddAmount').value=''; $('#savingsNote').value=s?.note||''; $('#deleteSavingsBtn').classList.toggle('d-none',!s); updateSavingsPreview(s); showModal('#savingsModal');
}
function updateSavingsPreview(existing=null){
  const goal=goalById($('#savingsGoal')?.value),target=Number($('#savingsTarget')?.value||goal?.targetAmount||0),base=Number($('#savingsStarting')?.value||existing?.startingAmount||0),history=(existing?.transactions||[]).reduce((a,t)=>a+Number(t.amount||0),0),add=Number($('#savingsAddAmount')?.value||0),current=base+history+add,pct=target?Math.min(100,Math.round(current/target*100)):0;
  if($('#savingsPreview')) $('#savingsPreview').innerHTML=`<strong>Projected total: ${money(current)}</strong>${target?`<div class="progress mt-2"><div class="progress-bar" style="width:${pct}%"></div></div><small>${pct}% complete · ${money(Math.max(0,target-current))} remaining</small>`:'<small class="d-block muted">Set a target here or on the linked goal for progress calculations.</small>'}`;
}
async function saveSavings(e){
  e.preventDefault(); const id=$('#savingsId').value,old=id?store.getById('savings',id):null,title=$('#savingsTitle').value.trim(); if(!title)return;
  const add=Number($('#savingsAddAmount').value)||0,transactions=[...(old?.transactions||[])]; if(add>0) transactions.push({id:uid(),amount:add,date:todayISO(),createdAt:Date.now()});
  const item={...old,id:id||uid(),title,goalId:$('#savingsGoal').value,targetAmount:Number($('#savingsTarget').value)||0,startingAmount:Number($('#savingsStarting').value)||0,note:$('#savingsNote').value.trim(),transactions,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()}; await store.upsert('savings',item); closeModal('#savingsModal'); toast(add?`${money(add)} added to savings`:'Savings tracker saved');
}
function deleteSavings(){ const x=store.getById('savings',$('#savingsId').value); if(!x)return; closeModal('#savingsModal'); setTimeout(()=>requestDelete({type:'savings',id:x.id,title:x.title,afterDelete:render}),220); }

function fillSearchFilters(){ $('#searchGoal').innerHTML=optionList(store.data.goals,'All goals'); $('#searchProject').innerHTML=optionList(store.data.projects,'All projects'); }
function openSearch(){ fillSearchFilters(); renderSearchResults(); showModal('#searchModal'); }
function renderSearchResults(){
  const a=state.advanced; const rows=(store.data.tasks||[]).filter(t=>(!a.text||`${t.title} ${t.notes||''}`.toLowerCase().includes(a.text.toLowerCase()))&&(!a.category||t.category===a.category)&&(!a.priority||t.priority===a.priority)&&(!a.goalId||t.goalId===a.goalId)&&(!a.projectId||t.projectId===a.projectId)&&(!a.frequency||t.frequency===a.frequency)&&(!a.status||(a.status==='done'?t.completed:!t.completed)));
  $('#searchResults').innerHTML=rows.map(t=>`<button class="search-result" data-search-task="${t.id}"><span><strong>${esc(t.title)}</strong><small>${esc(taskMeta(t))} · ${esc(recurrenceLabel(t))}</small></span><i class="bi bi-chevron-right"></i></button>`).join('')||'<p class="muted">No matching tasks.</p>';
  $$('[data-search-task]').forEach(b=>b.onclick=()=>{ closeModal('#searchModal'); setTimeout(()=>viewTask(store.getById('tasks',b.dataset.searchTask)),220); });
}

function initDragAndFullscreen(){
  const grid=$('#dashboardGrid'),key='dashboard-v4-order',saved=JSON.parse(localStorage.getItem(key)||'[]'); saved.forEach(id=>{const el=document.getElementById(id);if(el)grid.appendChild(el)});
  $$('#dashboardGrid > [data-widget]').forEach(el=>{ el.draggable=true; el.addEventListener('dragstart',e=>{ if(e.target.closest('button,input,a')){e.preventDefault();return;} el.classList.add('dragging'); }); el.addEventListener('dragend',()=>{el.classList.remove('dragging');localStorage.setItem(key,JSON.stringify($$('#dashboardGrid > [data-widget]').map(x=>x.id)));}); });
  grid.addEventListener('dragover',e=>{ e.preventDefault(); const dragging=$('.dragging'); if(!dragging)return; const candidates=$$('#dashboardGrid > [data-widget]:not(.dragging)'); const after=candidates.find(x=>e.clientY<x.getBoundingClientRect().top+x.offsetHeight/2); after?grid.insertBefore(dragging,after):grid.appendChild(dragging); });
  $$('.widget-expand').forEach(btn=>btn.onclick=()=>{ const panel=btn.closest('[data-widget]'),full=panel.classList.toggle('widget-fullscreen'); document.body.classList.toggle('body-widget-fullscreen',full); btn.innerHTML=`<i class="bi ${full?'bi-fullscreen-exit':'bi-arrows-fullscreen'}"></i>`; });
}

function toggleSidebar(open){
  const mobile=window.matchMedia('(max-width: 900px)').matches;
  if(mobile){ $('#sidebar').classList.toggle('open',open ?? !$('#sidebar').classList.contains('open')); return; }
  settings.sidebarOpen=open ?? !settings.sidebarOpen; localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); applySettings();
}

async function planDay(){
  const box=$('#aiResult'),tasks=taskForDate().filter(t=>!t.completed); if(!tasks.length){box.innerHTML='<div class="ai-step">Nothing open to plan for this day.</div>';return;} box.innerHTML='<div class="ai-step">Building your plan…</div>';
  try{ const r=await fetch(`${API_BASE_URL}/plan-day`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:selectedISO(),tasks})}); const d=await r.json(); if(!r.ok)throw new Error(d.error||'Plan request failed'); const plan=d.plan; box.innerHTML=typeof plan==='string'?`<div class="ai-step linkified">${linkify(plan)}</div>`:`<pre class="ai-step">${esc(JSON.stringify(plan,null,2))}</pre>`; }catch(err){ box.innerHTML=`<div class="ai-step">AI server unavailable: ${esc(err.message)}</div>`; }
}

let analyticsController=null, voiceController=null;
function showWorkspace(name='dashboard'){
  $('#dashboardView')?.classList.toggle('d-none',name!=='dashboard');
  $('#weekStrip')?.classList.toggle('d-none',name!=='dashboard');
  $('#rolloverAlert')?.classList.toggle('d-none',name!=='dashboard');
  $('#analyticsScreen')?.classList.toggle('d-none',name!=='analytics');
  $('#assistantScreen')?.classList.toggle('d-none',name!=='assistant');
  if(name==='analytics') analyticsController?.render?.();
  window.scrollTo({top:0,behavior:'smooth'});
}

function bind(){
  $('#activityReviewForm').onsubmit=saveActivityReview; $('#reviewActivityBtn').onclick=openActivityReview; $('#addDailyBlockBtn').onclick=openDailyBlock; $('#dailyBlockForm').onsubmit=saveDailyBlock; $('#taskTitle').oninput=renderTaskSuggestions;
  $('#mobileMenu').onclick=()=>toggleSidebar(true); $('#closeSidebarBtn').onclick=()=>toggleSidebar(false); $('#settingsBtn').onclick=()=>showModal('#settingsModal');
  $('#analyticsNavBtn').onclick=()=>showWorkspace('analytics'); $('#assistantNavBtn').onclick=()=>showWorkspace('assistant'); $('#analyticsBack').onclick=()=>showWorkspace('dashboard'); $('#assistantBack').onclick=()=>showWorkspace('dashboard');
  ['settingCompact','settingSidebarOpen','settingShowCompleted','settingSlideshow','settingAutoPlan','settingActivityBatch','settingVoiceEnabled','settingVoiceTalkBack','settingWakePhrase','settingWakePhraseText','settingVoiceSchedule','settingVoiceStart','settingVoiceEnd','settingVoiceRate'].forEach(id=>{const el=$(`#${id}`);if(el)el.onchange=saveSettings});
  $('#resetWidgetOrder').onclick=()=>{localStorage.removeItem('dashboard-v4-order');toast('Widget order reset. Reloading layout.');setTimeout(()=>location.reload(),400);};
  $('#todayBtn').onclick=()=>{state.selectedDate=new Date();render();}; $('#prevDay').onclick=()=>{state.selectedDate.setDate(state.selectedDate.getDate()-1);render();}; $('#nextDay').onclick=()=>{state.selectedDate.setDate(state.selectedDate.getDate()+1);render();};
  $('#globalSearch').oninput=e=>{state.search=e.target.value.trim().toLowerCase();renderTasks();};
  $$('.filter').forEach(b=>b.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;renderTasks();});
  $$('[data-open-task]').forEach(b=>b.onclick=()=>openTask()); $$('[data-add]').forEach(b=>b.onclick=()=>openItem(b.dataset.add)); $('#quickNoteBtn').onclick=()=>openItem('note');
  $('#taskFrequency').onchange=frequencyUI; $('#taskForm').onsubmit=saveTask; $('#deleteTaskBtn').onclick=deleteTask; $('#itemForm').onsubmit=saveItem; $('#deleteItemBtn').onclick=deleteItem; $('#analyzeNoteBtn').onclick=analyzeNote;
  $('#addWorkoutBtn').onclick=()=>openWorkout(); $('#addWorkoutBtn2').onclick=()=>openWorkout(); $('#workoutForm').onsubmit=saveWorkout; $('#deleteWorkoutBtn').onclick=deleteWorkout; $('#addExerciseRow').onclick=()=>addExercise();
  $('#addSavingsBtn').onclick=()=>openSavings(); $('#addSavingsBtn2').onclick=()=>openSavings(); $('#savingsForm').onsubmit=saveSavings; $('#deleteSavingsBtn').onclick=deleteSavings; ['savingsGoal','savingsTarget','savingsStarting','savingsAddAmount'].forEach(id=>$(`#${id}`).oninput=()=>updateSavingsPreview($('#savingsId').value?store.getById('savings',$('#savingsId').value):null));
  $('#advancedSearchBtn').onclick=openSearch; $('#advancedSearchBtnTop').onclick=openSearch; $$('[data-search-filter]').forEach(e=>e.oninput=()=>{state.advanced={text:$('#searchText').value,category:$('#searchCategory').value,priority:$('#searchPriority').value,status:$('#searchStatus').value,goalId:$('#searchGoal').value,projectId:$('#searchProject').value,frequency:$('#searchFrequency').value};renderSearchResults();});
  $('#planDayBtn').onclick=planDay; $('#galleryBtn').onclick=()=>openGallery(0); $('#galleryOpenAll').onclick=()=>openGallery(0);
  window.addEventListener('calendar:add-task',e=>openTask(null,e.detail?.date||selectedISO())); window.addEventListener('calendar:edit-task',e=>{const t=store.getById('tasks',e.detail?.id);if(t)viewTask(t);});
  document.addEventListener('click',e=>{ if(e.target.closest('.linkified a'))e.stopPropagation(); });
  $$('[data-assistant-prompt]').forEach(b=>b.onclick=()=>{showWorkspace('assistant');voiceController?.send?.(b.dataset.assistantPrompt)});
  document.querySelector('.nav-link.active')?.addEventListener('click',()=>showWorkspace('dashboard')); 
}

async function init(){
  await store.init(); if(!(store.data.dayPlans||[]).some(x=>x.date===todayISO())) scheduleAutoPlan('daily-start'); initDeleteManager(store); initCalendarPopup(store); bind(); initDragAndFullscreen(); applySettings(); analyticsController=initAnalytics(store,{apiBaseUrl:API_BASE_URL,onBack:()=>showWorkspace('dashboard')}); voiceController=initVoiceAssistant(store,{apiBaseUrl:API_BASE_URL,getSettings:()=>settings,saveSettings,toast}); store.subscribe(()=>dispatchRender()); render(); renderCalendar();
}
init().catch(e=>{console.error(e);toast('Unable to initialize the dashboard.');});
