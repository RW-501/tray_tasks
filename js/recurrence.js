const parse = s => { const [y,m,d]=(s||'').split('-').map(Number); return y?new Date(y,m-1,d,12):null; };
export const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daysBetween=(a,b)=>Math.floor((b-a)/86400000);
const monthsBetween=(a,b)=>(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();
export function occursOn(task, dateISO){
  if (!task?.date || !dateISO) return false;
  if (!task.frequency || task.frequency === 'Once') return task.date === dateISO;
  const start=parse(task.date), date=parse(dateISO); if(!start||!date||date<start) return false;
  if(task.frequencyEndDate && dateISO>task.frequencyEndDate) return false;
  const interval=Math.max(1,Number(task.frequencyInterval)||1), diff=daysBetween(start,date);
  if(task.frequency==='Daily') return diff%interval===0;
  if(task.frequency==='Weekly'){
    const selected=(task.frequencyDays||[]).map(Number);
    const allowed=selected.length?selected:[start.getDay()];
    return allowed.includes(date.getDay()) && Math.floor(diff/7)%interval===0;
  }
  if(task.frequency==='Monthly') return date.getDate()===start.getDate() && monthsBetween(start,date)%interval===0;
  if(task.frequency==='Yearly') return date.getDate()===start.getDate() && date.getMonth()===start.getMonth() && (date.getFullYear()-start.getFullYear())%interval===0;
  return task.date===dateISO;
}
export function isOccurrenceComplete(task,dateISO){ return task.frequency && task.frequency!=='Once' ? (task.completedDates||[]).includes(dateISO) : Boolean(task.completed); }
export function taskOccurrencesForDate(tasks,dateISO){ return (tasks||[]).filter(t=>occursOn(t,dateISO)).map(t=>({...t, occurrenceDate:dateISO, completed:isOccurrenceComplete(t,dateISO)})); }
export function recurrenceLabel(task){
  if(!task.frequency||task.frequency==='Once') return 'One time';
  let label=task.frequencyInterval>1?`Every ${task.frequencyInterval} ${task.frequency.toLowerCase().replace('daily','days').replace('weekly','weeks').replace('monthly','months').replace('yearly','years')}`:`${task.frequency}`;
  if(task.frequency==='Weekly' && task.frequencyDays?.length) label += ` · ${task.frequencyDays.map(n=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n]).join(', ')}`;
  if(task.frequencyEndDate) label += ` · until ${task.frequencyEndDate}`; return label;
}
