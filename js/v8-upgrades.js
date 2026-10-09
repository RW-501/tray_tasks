// V8 additive tools: account reconciliation, note media, and local data backup.
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const day=s=>String(s||'').slice(0,10);
export function initV8(store){
 const nav=$('.sidebar nav');
 const add=(label,modal,icon)=>{if(!nav)return;const b=document.createElement('button');b.className='nav-link';b.innerHTML=`<i class="bi bi-${icon}"></i>${label}`;b.onclick=()=>bootstrap.Modal.getOrCreateInstance($(modal)).show();nav.append(b)};
 add('Reconcile balances','#v8ReviewModal','arrow-left-right');add('Note media','#v8MediaModal','images');add('Backup & privacy','#v8BackupModal','shield-lock');
 const changes=()=>store.getAll('accountHistory').filter(h=>!h.isOpeningBalance&&Number(h.delta)!==0).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 const renderReconcile=()=>{
  const explanations=store.getAll('balanceExplanations');const purchases=store.getAll('shopping').filter(x=>x.purchased);
  $('#v8ReconcileList').innerHTML=changes().slice(0,100).map(h=>{
   const a=store.getById('accounts',h.accountId);const prior=explanations.find(x=>x.historyId===h.id);
   const matches=purchases.filter(x=>Math.abs(Number(x.cost||0)*Number(x.quantity||1)+Number(h.delta))<.01&&Math.abs(new Date(x.purchasedAt||0)-new Date(h.at))<3*86400000).slice(0,3);
   return `<div class="v8-reconcile" data-history="${esc(h.id)}"><strong>${esc(a?.name||'Account')} · ${cash(h.delta)}</strong><small>${esc(day(h.at))} · ${esc(h.reason||'No explanation recorded')}</small>${matches.length?`<p class="muted">Possible matching purchase: ${matches.map(x=>esc(x.title)).join(', ')} (amount/date match only)</p>`:''}<div class="v8-fields"><select class="form-select v8-kind"><option value="unexplained">Unexplained</option>${['Paycheck','Purchase','Bill','Transfer','Investment gain/loss','Adjustment','Other'].map(k=>`<option ${prior?.kind===k?'selected':''}>${k}</option>`).join('')}</select><input class="form-control v8-description" placeholder="What caused this change?" value="${esc(prior?.description||'')}"><button class="btn btn-outline-light v8-save" type="button">Save explanation</button></div></div>`
  }).join('')||'<p class="muted">No account balance changes yet. Enter at least two snapshots for an account.</p>';
  $('#v8ReconcileList').querySelectorAll('.v8-save').forEach(b=>b.onclick=async()=>{const row=b.closest('[data-history]');const h=store.getById('accountHistory',row.dataset.history);if(!h)return;const old=explanations.find(x=>x.historyId===h.id);await store.upsert('balanceExplanations',{id:old?.id||uuid(),historyId:h.id,accountId:h.accountId,delta:h.delta,date:day(h.at),kind:row.querySelector('.v8-kind').value,description:row.querySelector('.v8-description').value.trim(),updatedAt:new Date().toISOString()});b.textContent='Saved';});
 };
 $('#v8ReviewModal').addEventListener('show.bs.modal',renderReconcile);
 $('#v8MediaModal').addEventListener('show.bs.modal',()=>{const notes=store.getAll('notes');const items=notes.flatMap(n=>(n.attachments||[]).map(a=>({a,n})));$('#v8MediaList').innerHTML=items.map(({a,n})=>`<article class="v8-media"><strong>${esc(n.title||'Note')}</strong>${String(a.type||'').startsWith('image/')?`<img loading="lazy" src="${esc(a.url)}" alt="${esc(a.name)}">`:String(a.type||'').startsWith('video/')?`<video controls preload="metadata" src="${esc(a.url)}"></video>`:''}<a target="_blank" rel="noopener noreferrer" href="${esc(a.url)}">${esc(a.name||'Open media')}</a><small>${esc(store.getById('goals',n.goalId)?.title||'')} ${esc(store.getById('projects',n.projectId)?.title||'')}</small></article>`).join('')||'<p>No note uploads yet.</p>'});
 $('#v8TrackUsage').checked=localStorage.getItem('cc-usage-optout')!=='true';$('#v8TrackUsage').onchange=e=>localStorage.setItem('cc-usage-optout',String(!e.target.checked));
 $('#v8ExportBtn').onclick=()=>{const data={exportedAt:new Date().toISOString(),schemaVersion:8,collections:store.data};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`command-center-backup-${day(new Date().toISOString())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
}
