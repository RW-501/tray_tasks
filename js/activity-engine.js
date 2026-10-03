export const ACTIVITY_TYPES = ['task','shopping','workout','work','sleep','school','habit'];
export function partOfDay(time=''){
  const h=Number(String(time).split(':')[0]);
  if(!Number.isFinite(h)) return 'Unknown';
  if(h<5) return 'Late night'; if(h<12) return 'Morning'; if(h<17) return 'Afternoon'; if(h<21) return 'Evening'; return 'Night';
}
export function minutesBetween(start,end){
  if(!start||!end)return 0; const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number); let n=(eh*60+em)-(sh*60+sm); if(n<0)n+=1440; return n;
}
export function activityStats(logs=[]){
  const byType={},byPart={},byDay={}; let minutes=0;
  logs.forEach(x=>{byType[x.type]=(byType[x.type]||0)+1;byPart[x.partOfDay||'Unknown']=(byPart[x.partOfDay||'Unknown']||0)+1;byDay[x.date]=(byDay[x.date]||0)+1;minutes+=Number(x.durationMinutes||0)});
  return {count:logs.length,minutes,byType,byPart,byDay};
}
export function titleKey(v=''){return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function suggestionsFor(prefix,store,limit=6){
  const q=titleKey(prefix); if(q.length<2)return [];
  const counts=new Map();
  [...(store.data.activityLogs||[]),...(store.data.tasks||[]).map(t=>({title:t.title,type:'task'})),...(store.data.shopping||[]).map(t=>({title:t.title,type:'shopping'}))].forEach(x=>{
    const title=x.title||''; const key=titleKey(title); if(!key.includes(q))return; const old=counts.get(key)||{title,type:x.type||'task',count:0}; old.count++; counts.set(key,old);
  });
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title)).slice(0,limit);
}
