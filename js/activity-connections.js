// Activity Connections: suggested links, safe task completion, and reviewed finance handoff.
export function initActivityConnections(store){
 const $=s=>document.querySelector(s);
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\b(i|just|did|the|a|an|my|to|for|today|yesterday)\b/g,' ').replace(/\s+/g,' ').trim();
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const score=(title,item)=>{const a=norm(title),b=norm(item.title||item.name);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)>=5?.88:0;const aa=new Set(a.split(' ')),bb=new Set(b.split(' '));return [...aa].filter(x=>bb.has(x)).length/Math.max(aa.size,bb.size)};
 const activeTasks=()=>store.getAll('tasks').filter(t=>!t.completed);
 const options=(col,title)=>store.getAll(col).map(x=>({x,score:score(title,x)})).filter(x=>x.score>=.35).sort((a,b)=>b.score-a.score).slice(0,5);
 const card=$('#ccActivityConnections');if(!card)return;
 const task=$('#ccLinkTask'),goal=$('#ccLinkGoal'),project=$('#ccLinkProject'),saving=$('#ccLinkSavings'),account=$('#ccLinkAccount');
 const setOptions=(el,records,label,selected='')=>{el.replaceChildren(new Option(label,''));for(const r of records)el.add(new Option(r.title||r.name||r.id,r.id));el.value=selected||''};
 let lastTitle='',suggested=false;
 function suggest(force=false){const title=$('#ccActivityTitle').value.trim();if(!force&&title===lastTitle)return;lastTitle=title;
  const old=window.__ccActivityEditId?store.getById('activityLogs',window.__ccActivityEditId):null;
  const tasks=activeTasks(),matches=options('tasks',title).filter(x=>!x.x.completed);
  const orderedTasks=[...new Map([...matches.map(x=>[x.x.id,x.x]),...tasks.map(x=>[x.id,x])]).values()];
  setOptions(task,orderedTasks,'No task link',old?.taskId||matches[0]?.x.id);
  const fill=(el,col,oldId)=>{const ranked=options(col,title);const all=store.getAll(col);setOptions(el,[...new Map([...ranked.map(x=>[x.x.id,x.x]),...all.map(x=>[x.id,x])]).values()],`No ${col.slice(0,-1)} link`,oldId||ranked[0]?.x.id)};
  fill(goal,'goals',old?.goalId);fill(project,'projects',old?.projectId);fill(saving,'savings',old?.savingsId);
  const accounts=store.getAll('accounts');const matched=accounts.filter(a=>norm(title).includes(norm(a.name))&&norm(a.name).length>=3);
  setOptions(account,[...matched,...accounts.filter(a=>!matched.includes(a))],'Choose account',old?.accountId||matched[0]?.id);
  const m=title.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);$('#ccLinkAmount').value=old?.moneyAmount??(m?m[1].replaceAll(',',''):'');
  const looksMoney=/(sav(?:e|ed|ing)|deposit|transfer|paid|spent|bought|put .*\$|\$.*(?:in|into|to))/i.test(title);
  $('#ccMoneyConnect').classList.toggle('d-none',!looksMoney&&!old?.moneyAmount);
  const best=matches[0];const exact=best?.score===1&&matches.filter(x=>x.score===1).length===1;
  $('#ccLinkTaskAuto').checked=!!(exact&&!old);
  $('#ccLinkTaskAuto').disabled=!task.value||!!old?.taskCompletionApplied;
  $('#ccActivitySuggestions').textContent=best?`Suggested task: ${best.x.title} (${Math.round(best.score*100)}% title match). Review before saving.`:'No matching open task found. You can select any task manually.';
  suggested=true;
 }
 $('#ccActivityTitle').addEventListener('input',()=>suggest());
 $('#ccActivityChips').addEventListener('click',()=>setTimeout(()=>suggest(true),0));
 $('#ccQuickActivityModal').addEventListener('shown.bs.modal',()=>setTimeout(()=>suggest(true),120));
 task.addEventListener('change',()=>{$('#ccLinkTaskAuto').checked=false;$('#ccLinkTaskAuto').disabled=!task.value});
 $('#ccLinkSavings').addEventListener('change',()=>{const x=store.getById('savings',saving.value);if(x?.goalId)goal.value=x.goalId});
 const savedMarker=(id,taskId)=>`${id}:${taskId}`;
 async function afterSave(record){
  const t=store.getById('tasks',task.value);const old=store.getById('activityLogs',record.id);
  const links={taskId:task.value,goalId:goal.value,projectId:project.value,savingsId:saving.value,accountId:account.value,moneyAmount:Number($('#ccLinkAmount').value)||0};
  if(t){if(!links.goalId)links.goalId=t.goalId||'';if(!links.projectId)links.projectId=t.projectId||'';}
  const complete=!!(t&&$('#ccLinkTaskAuto').checked&&!old?.taskCompletionApplied);
  // The activity is already saved; persist links before any optional side effect.
  await store.upsert('activityLogs',{...old,...record,...links,updatedAt:Date.now()});
  if(complete){
   const latest=store.getById('tasks',t.id);
   if(latest&&!latest.completed&&!(latest.completedDates||[]).includes(record.date)){
    const updated=latest.frequency&&latest.frequency!=='Once'?{...latest,completedDates:[...new Set([...(latest.completedDates||[]),record.date])]}:{...latest,completed:true};
    await store.upsert('tasks',{...updated,completedByActivityId:record.id,updatedAt:Date.now()});
    await store.upsert('activityLogs',{...store.getById('activityLogs',record.id),taskCompletionApplied:true,updatedAt:Date.now()});
   }
  }
  // Money is never changed here: confirmation must happen in the Money Workspace.
  if(links.moneyAmount>0&&links.accountId){
   sessionStorage.setItem('cc-money-draft',JSON.stringify({activityId:record.id,...links,title:record.title}));
   $('#ccMoneyDraftNotice').classList.remove('d-none');
   setTimeout(()=>{if(confirm('Activity saved. Open Money Workspace to REVIEW the suggested transaction? No balance has been changed.'))openMoneyDraft()},450);
  }
 }
 window.commandCenterActivity={afterSave,interpret(text){
  const phrase=String(text||'').trim();
  if(!/^(?:hey tray[, ]*)?(?:log|record|track|i just|i did|i went|i called|i put|i deposited|i saved|mark .* done|finished )\b/i.test(phrase))return null;
  const title=phrase.replace(/^hey tray[, ]*/i,'').replace(/^(log|record|track)\s+(?:an?\s+activity\s+)?/i,'').replace(/^i (?:just |did |went |called |put |deposited |saved )/i,m=>m.toLowerCase().includes('called')?'Called ':m.toLowerCase().includes('put')?'Put ':m.toLowerCase().includes('deposited')?'Deposited ':m.toLowerCase().includes('saved')?'Saved ':'').trim();
  if(!title)return null;
  bootstrap.Modal.getInstance($('#v7AssistantModal'))?.hide();
  setTimeout(()=>{bootstrap.Modal.getOrCreateInstance($('#ccQuickActivityModal')).show();setTimeout(()=>{$('#ccActivityTitle').value=title;suggest(true)},250)},300);
  return 'I prepared an activity entry and suggested related tasks, goals, projects, and savings. Please review and save it. Financial changes require separate confirmation.';
 }};
 $('#ccOpenMoneyDraft')?.addEventListener('click',()=>openMoneyDraft());
 function openMoneyDraft(){const raw=sessionStorage.getItem('cc-money-draft');if(!raw)return;let d;try{d=JSON.parse(raw)}catch{return}
  bootstrap.Modal.getInstance($('#ccQuickActivityModal'))?.hide();
  setTimeout(()=>{bootstrap.Modal.getOrCreateInstance($('#v7FinanceModal')).show();setTimeout(()=>{
   $('#v7AccountSelect').value=d.accountId;$('#v7AccountSelect').dispatchEvent(new Event('change'));
   $('#moneyTransactionAmount').value=d.moneyAmount;$('#moneyTransactionReason').value=d.title;
   $('#moneyTransactionKind').value='deposit';
   if(d.savingsId){$('#moneyLinkKind').value='savings';$('#moneyLinkKind').dispatchEvent(new Event('change'));$('#moneyLinkItem').value=d.savingsId}
   else if(d.goalId){$('#moneyLinkKind').value='goals';$('#moneyLinkKind').dispatchEvent(new Event('change'));$('#moneyLinkItem').value=d.goalId}
   $('#moneyTransactionFeedback').textContent='Review the account, transaction type, and amount before pressing Add transaction. This draft has NOT changed any balance.';
  },300)},300);
 }
}
