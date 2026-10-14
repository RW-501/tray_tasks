// Local per-screen shortcuts, deliberately independent of Firestore device nav ordering.
export function initQuickAccess(store){
 const $=q=>document.querySelector(q);
 const key='cc-quick-shortcuts-v2',favoriteKey='cc-tool-favorites-v1';
 const defaults=['Log Activity','Tray AI','Add Task','Timeline','Money Workspace'];
 const catalog=[
 ['Log Activity','#ccQuickActivityModal','bi-plus-circle'],['Tray AI','#v7AssistantModal','bi-stars'],
 ['Add Task','task','bi-list-task'],['Timeline','#unifiedTimelineModal','bi-clock-history'],
 ['Money Workspace','#ccMoneyWorkspaceModal','bi-wallet2'],['Web Viewer','#ccWebViewerModal','bi-globe2'],['Shopping','shopping','bi-cart3'],
 ['Goals','goal','bi-bullseye'],['Projects','project','bi-kanban'],
 ['Habits','#v7HabitHistoryModal','bi-check-circle'],['Workouts','workout','bi-heart-pulse'],
 ['Life Intelligence','#ccIntelligenceModal','bi-graph-up-arrow'],
 ['All Tools','#ccToolFinderModal','bi-grid-3x3-gap'],
 ['Customize Screen','#ccLuxuryModal','bi-layout-wtf'],['Manage Devices','#ccDeviceWizardModal','bi-display'],
 ['Control Screens','#ccRemoteModal','bi-cast'],['Calendar','calendar','bi-calendar3'],
 ['Notes','note','bi-journal-text'],['Transactions','#moneyLedgerModal','bi-receipt']
 ];
 const byName=new Map(catalog.map(x=>[x[0],x]));
 const read=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v:fallback}catch{return fallback}};
 let selected=read(key,defaults).filter(x=>byName.has(x)).slice(0,8);
 const showModal=id=>{const el=$(id);if(!el)return;const current=document.querySelector('.modal.show');if(current&&current!==el){bootstrap.Modal.getInstance(current)?.hide();setTimeout(()=>bootstrap.Modal.getOrCreateInstance(el).show(),250)}else bootstrap.Modal.getOrCreateInstance(el).show()};
 const run=name=>{const item=byName.get(name);if(!item)return;const target=item[1];if(target.startsWith('#'))return showModal(target);
 if(target==='task')return $('[data-open-task]')?.click();
 if(target==='calendar')return $('[data-view="calendar"]')?.click();
 if(['goal','project','shopping','note'].includes(target))return $(`[data-add="${target}"]`)?.click();
 if(target==='workout')return $('#addWorkoutBtn')?.click();
 };
 const render=()=>{const host=$('#ccQuickActionButtons');if(!host)return;host.replaceChildren();for(const name of selected){const item=byName.get(name);if(!item)continue;const b=document.createElement('button');b.type='button';b.className='btn '+(name===selected[0]?'btn-neon':'btn-outline-light');const i=document.createElement('i');i.className='bi '+item[2];b.append(i,document.createTextNode(' '+name));b.onclick=()=>run(name);host.append(b)}};
 const choices=()=>{const host=$('#ccQuickAccessChoices');host.replaceChildren();for(const [name,,icon] of catalog){const row=document.createElement('div');row.className='cc-quick-choice';const cb=document.createElement('input');cb.type='checkbox';cb.className='form-check-input';cb.checked=selected.includes(name);cb.id='quick-'+catalog.indexOf(byName.get(name));cb.onchange=()=>{if(cb.checked){if(selected.length>=8){cb.checked=false;$('#ccQuickAccessStatus').textContent='Choose up to eight shortcuts.';return}selected.push(name)}else selected=selected.filter(x=>x!==name);choices()};const label=document.createElement('label');label.htmlFor=cb.id;label.textContent=name;const i=document.createElement('i');i.className='bi '+icon;label.prepend(i,document.createTextNode(' '));row.append(cb,label);if(cb.checked){for(const [symbol,step] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.className='btn btn-sm btn-outline-light';b.textContent=symbol;b.setAttribute('aria-label',symbol==='↑'?'Move '+name+' up':'Move '+name+' down');b.onclick=()=>{const ix=selected.indexOf(name),next=ix+step;if(next<0||next>=selected.length)return;[selected[ix],selected[next]]=[selected[next],selected[ix]];choices()};row.append(b)}}host.append(row)}$('#ccQuickAccessStatus').textContent=selected.length+' of 8 shortcuts selected'};
 $('#ccQuickAccessModal').addEventListener('show.bs.modal',choices);
 $('#ccQuickAccessSave').onclick=()=>{localStorage.setItem(key,JSON.stringify(selected));render();bootstrap.Modal.getInstance($('#ccQuickAccessModal'))?.hide()};
 $('#ccQuickAccessReset').onclick=()=>{selected=[...defaults];choices()};
 const pinned=document.createElement('section');pinned.className='cc-pinned-favorites';pinned.setAttribute('aria-label','Favorite tools');
 const nav=$('.sidebar nav');nav?.parentElement?.insertBefore(pinned,nav);
 const pinnedRender=()=>{pinned.replaceChildren();const favorites=read(favoriteKey,[]);if(!favorites.length)return;const h=document.createElement('strong');h.textContent='★ FAVORITES';pinned.append(h);const all=window.commandCenterTools?.()||[];for(const name of favorites){const tool=all.find(t=>t.label===name);if(!tool)continue;const b=document.createElement('button');b.type='button';b.className='nav-link';b.textContent='★ '+name;b.onclick=()=>tool.action();pinned.append(b)}};
 window.addEventListener('cc:favorites-changed',pinnedRender);
 $('#ccToolFinderModal')?.addEventListener('shown.bs.modal',pinnedRender);
 render();pinnedRender();
}
