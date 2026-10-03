import { activityStats } from './activity-engine.js';

const $=s=>document.querySelector(s);
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const mins=t=>{if(!t)return null;const [h,m]=t.split(':').map(Number);return h*60+m};
const fmtMin=n=>`${Math.floor(n/60)}h ${Math.round(n%60)}m`;

export function initAnalytics(store,{apiBaseUrl,onBack}={}){
  const screen=$('#analyticsScreen'); if(!screen)return;
  let range=30;
  const filtered=()=>{const cutoff=Date.now()-range*86400000;return (store.data.activityLogs||[]).filter(x=>!x.needsReview&&Number(x.createdAt||new Date(`${x.date}T12:00`).getTime())>=cutoff)};
  function render(){
    const logs=filtered(), stats=activityStats(logs), days=new Set(logs.map(x=>x.date)).size||1;
    const tasks=logs.filter(x=>x.type==='task'), blocks=(store.data.dailyBlocks||[]).filter(x=>Date.now()-new Date(`${x.date}T12:00`).getTime()<=range*86400000);
    const sleep=blocks.filter(x=>x.type==='sleep').reduce((a,x)=>a+Number(x.durationMinutes||0),0);
    const work=blocks.filter(x=>x.type==='work').reduce((a,x)=>a+Number(x.durationMinutes||0),0);
    const byPart=Object.entries(stats.byPart).sort((a,b)=>b[1]-a[1]);
    const byType=Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]);
    const planned=[]; tasks.forEach(x=>{const source=store.getById('tasks',x.sourceId);if(source?.startTime&&x.time){let d=mins(x.time)-mins(source.startTime);if(d>720)d-=1440;if(d< -720)d+=1440;planned.push(d)}});
    const avgDrift=planned.length?Math.round(planned.reduce((a,b)=>a+b,0)/planned.length):null;
    $('#analyticsKpis').innerHTML=[
      ['Actions',stats.count,`${(stats.count/days).toFixed(1)} / active day`],
      ['Tracked time',fmtMin(stats.minutes),`${days} active days`],
      ['Sleep',fmtMin(sleep),`${(sleep/60/days).toFixed(1)}h / active day`],
      ['Work',fmtMin(work),`${(work/60/days).toFixed(1)}h / active day`],
      ['Schedule drift',avgDrift===null?'—':`${avgDrift>0?'+':''}${avgDrift} min`,planned.length?'actual vs planned':'need more timed tasks']
    ].map(x=>`<div class="analytics-kpi"><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong><span>${esc(x[2])}</span></div>`).join('');
    const maxPart=Math.max(1,...byPart.map(x=>x[1]));
    $('#analyticsParts').innerHTML=byPart.length?byPart.map(([k,v])=>`<div class="metric-row"><span>${esc(k)}</span><div><i style="width:${v/maxPart*100}%"></i></div><strong>${v}</strong></div>`).join(''):'<p class="muted">Complete and confirm activities to build this chart.</p>';
    const maxType=Math.max(1,...byType.map(x=>x[1]));
    $('#analyticsTypes').innerHTML=byType.length?byType.map(([k,v])=>`<div class="metric-row"><span>${esc(k)}</span><div><i style="width:${v/maxType*100}%"></i></div><strong>${v}</strong></div>`).join(''):'<p class="muted">No activity yet.</p>';
    const counts={};logs.forEach(x=>{const k=(x.title||x.type||'Activity').trim();counts[k]=(counts[k]||0)+1});
    $('#analyticsTop').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`<div class="analytics-rank"><strong>${esc(k)}</strong><span>${v} times</span></div>`).join('')||'<p class="muted">Patterns will appear as you log activity.</p>';
    renderHeatmap(logs);
  }
  function renderHeatmap(logs){
    const counts={};logs.forEach(x=>counts[x.date]=(counts[x.date]||0)+1);const days=[];for(let i=range-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push({date:iso(d),count:counts[iso(d)]||0})}const max=Math.max(1,...days.map(x=>x.count));
    $('#analyticsHeatmap').innerHTML=days.map(x=>`<div class="heat-cell level-${Math.min(4,Math.ceil(x.count/max*4))}" title="${x.date}: ${x.count} activities"><span>${new Date(`${x.date}T12:00`).getDate()}</span></div>`).join('');
  }
  async function aiInsights(){
    const box=$('#analyticsInsights');box.innerHTML='<div class="ai-step">Analyzing your recent patterns…</div>';
    try{const logs=filtered().slice(-160),blocks=(store.data.dailyBlocks||[]).slice(-100);const r=await fetch(`${apiBaseUrl}/productivity-insights`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rangeDays:range,activity:logs,blocks,tasks:(store.data.tasks||[]).slice(-100)})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Insight request failed');box.innerHTML=`<div class="ai-step analytics-ai">${esc(d.insight||'No insight returned.').replace(/\n/g,'<br>')}</div>`}catch(e){box.innerHTML=`<div class="ai-step">Unable to analyze right now: ${esc(e.message)}</div>`}
  }
  $('#analyticsRange').onchange=e=>{range=Number(e.target.value)||30;render()};
  $('#analyticsRefresh').onclick=render; $('#analyticsAiBtn').onclick=aiInsights; $('#analyticsBack').onclick=()=>onBack?.();
  store.subscribe(()=>{if(!screen.classList.contains('d-none'))render()});
  return {render};
}
