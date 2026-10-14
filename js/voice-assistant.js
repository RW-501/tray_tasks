const $=s=>document.querySelector(s);
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const nowTime=()=>new Date().toTimeString().slice(0,5);

export function initVoiceAssistant(store,{apiBaseUrl,getSettings,saveSettings,toast}={}){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null,listening=false,manualStop=false;
  const history=[];
  function settings(){return getSettings?.()||{}}
  function withinWindow(){const s=settings();if(!s.voiceScheduleEnabled)return true;const n=nowTime(),start=s.voiceStart||'07:00',end=s.voiceEnd||'22:00';return start<=end?n>=start&&n<end:n>=start||n<end}
  function speak(text){const s=settings();if(!s.voiceTalkBack||!('speechSynthesis'in window)||!text)return; speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=Number(s.voiceRate||1);speechSynthesis.speak(u)}
  function status(msg,active=false){const e=$('#voiceStatus');if(e)e.textContent=msg;$('#voiceMicBtn')?.classList.toggle('listening',active)}
  function renderMessage(role,text){const box=$('#assistantMessages');const div=document.createElement('div');div.className=`assistant-message ${role}`;div.innerHTML=`<span>${role==='user'?'YOU':'TRAY'}</span><p>${esc(text)}</p>`;box.appendChild(div);box.scrollTop=box.scrollHeight}
  function context(){return {date:today(),openTasks:(store.data.tasks||[]).filter(x=>!x.completed).slice(0,35).map(x=>({id:x.id,title:x.title,date:x.date,startTime:x.startTime,priority:x.priority,projectId:x.projectId,goalId:x.goalId})),todayBlocks:(store.data.dailyBlocks||[]).filter(x=>x.date===today()).map(x=>({type:x.type,title:x.title,startTime:x.startTime,endTime:x.endTime})),recentActivity:(store.data.activityLogs||[]).filter(x=>!x.needsReview).slice(-50).map(x=>({type:x.type,title:x.title,date:x.date,time:x.time,partOfDay:x.partOfDay,durationMinutes:x.durationMinutes})),goals:(store.data.goals||[]).slice(0,20).map(x=>({id:x.id,title:x.title,targetDate:x.targetDate})),projects:(store.data.projects||[]).slice(0,20).map(x=>({id:x.id,title:x.title}))}}
  async function send(text){text=String(text||'').trim();if(!text)return;renderMessage('user',text);history.push({role:'user',content:text});$('#assistantInput').value='';status('Thinking…');try{const remote=await window.commandCenterActivity?.interpret(text)||await window.commandCenterRemote?.interpret(text);if(remote){renderMessage('assistant',remote);history.push({role:'assistant',content:remote});speak(remote);status('Ready');return}const r=await fetch(`${apiBaseUrl}/assistant-chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-12),context:context()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Assistant unavailable');const reply=d.reply||'I did not get a response.';history.push({role:'assistant',content:reply});renderMessage('assistant',reply);renderActions(d.actions||[]);speak(reply);status(listening?'Listening for “Hey Tray”…':'Ready',listening)}catch(e){renderMessage('assistant',`I could not connect: ${e.message}`);status('Connection problem')}}
  function renderActions(actions){const box=$('#assistantActions');box.innerHTML='';actions.slice(0,5).forEach((a,i)=>{const b=document.createElement('button');b.className='assistant-action';b.innerHTML=`<span><strong>${esc(a.label||a.type)}</strong><small>${esc(a.summary||'Review and add')}</small></span><i class="bi bi-plus-circle"></i>`;b.onclick=async()=>{await applyAction(a);b.remove()};box.appendChild(b)})}
  async function applyAction(a){const p=a.payload||{},ts=Date.now();if(a.type==='task'){await store.upsert('tasks',{id:uid(),title:p.title||a.label||'Task',date:p.date||today(),startTime:p.startTime||'',estimatedMinutes:Number(p.estimatedMinutes)||30,priority:p.priority||'Medium',category:p.category||'Personal',notes:p.notes||'',goalId:p.goalId||'',projectId:p.projectId||'',frequency:'Once',completed:false,completedDates:[],createdAt:ts,updatedAt:ts})}else if(a.type==='dailyBlock'){const id=uid(),block={id,type:p.blockType||'other',title:p.title||a.label||'Activity',date:p.date||today(),startTime:p.startTime||nowTime(),endTime:p.endTime||'',durationMinutes:Number(p.durationMinutes)||0,notes:p.notes||'',createdAt:ts,updatedAt:ts};await store.upsert('dailyBlocks',block);await store.upsert('activityLogs',{id:uid(),type:block.type,title:block.title,sourceCollection:'dailyBlocks',sourceId:id,date:block.date,time:block.startTime,endTime:block.endTime,durationMinutes:block.durationMinutes,partOfDay:(()=>{const h=Number((block.startTime||'').split(':')[0]);return h<5?'Late night':h<12?'Morning':h<17?'Afternoon':h<21?'Evening':'Night'})(),needsReview:false,createdAt:ts,updatedAt:ts})}else if(a.type==='habit'){await store.upsert('habits',{id:uid(),title:p.title||a.label||'Habit',frequency:p.frequency||'Daily',details:p.details||'',createdAt:ts,updatedAt:ts})}else if(a.type==='note'){await store.upsert('notes',{id:uid(),title:p.title||a.label||'Assistant note',details:p.details||'',createdAt:ts,updatedAt:ts})}toast?.('Assistant action added');}
  let restartTimer=null, lastFinal='', lastFinalAt=0, voiceEpoch=0, wakePending=false;
  const live=()=>$('#voiceLiveTranscript');
  function transcript(text,final=false){const el=live();if(!el)return;el.textContent=text||'Waiting for speech…';el.dataset.final=String(final)}
  function showVoiceError(error){const hints={"not-allowed":"Microphone permission denied. Allow microphone access in browser site settings.","service-not-allowed":"Speech service blocked by browser or device.","audio-capture":"No microphone detected. Check input device.","network":"Speech recognition network unavailable. Try typing instead.","no-speech":"No speech detected. Check mic and speak clearly.","aborted":"Listening stopped.","language-not-supported":"Speech language not supported."};status(hints[error]||`Voice recognition: ${error}`)}
  function scheduleRestart(){clearTimeout(restartTimer);restartTimer=null;if(!manualStop&&settings().voiceEnabled&&withinWindow())restartTimer=setTimeout(()=>{restartTimer=null;start()},1100)}
  function start(){
    if(!Recognition){status('Speech recognition unavailable here. Try Chrome or Edge, or type your request.');return}
    if(!settings().voiceEnabled){status('Enable voice in Settings first');return}
    if(!withinWindow()){status('Outside scheduled listening hours');return}
    if(listening||recognition)return;
    manualStop=false;const instance=new Recognition();recognition=instance;const epoch=++voiceEpoch;
    instance.continuous=true;instance.interimResults=true;instance.lang='en-US';instance.maxAlternatives=1;
    instance.onstart=()=>{if(epoch!==voiceEpoch)return;listening=true;status(settings().wakePhraseEnabled?'Listening for “Hey Tray”…':'Listening…',true);transcript('Listening…')};
    instance.onresult=e=>{
      if(epoch!==voiceEpoch)return;
      let interim='',finals=[];
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i],part=r[0]?.transcript?.trim()||'';
        if(!part)continue;
        if(r.isFinal)finals.push(part);else interim+=(interim?' ':'')+part;
      }
      if(interim)transcript(interim,false);
      for(const phrase of finals){
        transcript(phrase,true);
        if(phrase.toLowerCase()===lastFinal.toLowerCase()&&Date.now()-lastFinalAt<2500)continue;
        lastFinal=phrase;lastFinalAt=Date.now();
        const wake=(settings().wakePhrase||'hey tray').toLowerCase();
        if(settings().wakePhraseEnabled){
          const low=phrase.toLowerCase(),index=low.indexOf(wake);
          if(index>=0){const after=phrase.slice(index+wake.length).replace(/^[,\s]+/,'');if(after){wakePending=false;send(after)}else{wakePending=true;status('Wake phrase heard — say your request',true)}}
          else if(wakePending){wakePending=false;send(phrase)}
          else status('Heard speech; waiting for “Hey Tray”…',true);
        }else send(phrase);
      }
    };
    instance.onerror=e=>{if(epoch!==voiceEpoch)return;showVoiceError(e.error);if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error))manualStop=true};
    instance.onend=()=>{if(epoch!==voiceEpoch)return;recognition=null;listening=false;$('#voiceMicBtn')?.classList.remove('listening');if(!manualStop)scheduleRestart();else status('Microphone off')};
    try{instance.start()}catch(e){recognition=null;status(`Unable to start microphone: ${e.message}`)}
  }
  function stop(){manualStop=true;clearTimeout(restartTimer);wakePending=false;voiceEpoch++;const old=recognition;recognition=null;listening=false;try{old?.abort()}catch{}status('Microphone off');transcript('Microphone off')}
  $('#voiceCopyTranscript')?.addEventListener('click',()=>{const text=live()?.textContent||'';if(text&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast?.('Transcript copied')).catch(()=>status('Could not copy transcript'))});
  $('#voiceUseTranscript')?.addEventListener('click',()=>{const text=live()?.textContent||'';if(text&&!['Listening…','Waiting for speech…','Microphone off'].includes(text))$('#assistantInput').value=text});
  $('#assistantSend').onclick=()=>send($('#assistantInput').value);$('#assistantInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e.target.value)}});$('#voiceMicBtn').onclick=()=>listening?stop():start();$('#assistantClear').onclick=()=>{$('#assistantMessages').innerHTML='';$('#assistantActions').innerHTML='';history.length=0};
  window.addEventListener('command-center:voice-settings',()=>{if(settings().voiceEnabled&&withinWindow())start();else stop()});
  setInterval(()=>{if(settings().voiceEnabled&&withinWindow()&&!listening&&!recognition&&!restartTimer)start();if(listening&&!withinWindow())stop()},60000);
  if(settings().voiceEnabled&&withinWindow())setTimeout(start,1200);
  return {send,start,stop,speak};
}
