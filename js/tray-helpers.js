// Deterministic conversational helpers. All timestamps are calculated at the moment of input.
export function parseWhen(input, base=new Date()) {
  const s=String(input||'').trim().toLowerCase();let d=new Date(base);
  if(/^(now|right now|just now)$/.test(s))return d;
  let m=s.match(/^(?:about\s+)?(?:an?\s+)?(\d+|a|an|one|five|ten|fifteen|thirty)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\s+ago$/);
  if(m){const nums={a:1,an:1,one:1,five:5,ten:10,fifteen:15,thirty:30};const n=nums[m[1]]||Number(m[1]);const u=m[2];d=new Date(+d-n*(u.startsWith('sec')?1000:u.startsWith('min')?60000:u.startsWith('h')?3600000:86400000));return d}
  m=s.match(/^(?:today\s+at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if(m){let h=Number(m[1]),min=Number(m[2]||0);if(min>59||h>23||m[3]&&h>12||m[3]&&h<1)return null;if(m[3])h=h%12+(m[3]==='pm'?12:0);d.setHours(h,min,0,0);return d}
  return null;
}
export const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const localTime=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const qty=s=>{const m=String(s).toLowerCase().match(/\b(\d+(?:\.\d+)?|one|a|an|i)\s*(?:containers?|bottles?|cups?|glasses?)\b/);if(!m)return null;return {amount:({one:1,a:1,an:1,i:1}[m[1]]??Number(m[1])),unit:(m[0].match(/containers?|bottles?|cups?|glasses?/)||['container'])[0].replace(/s$/,'')}};
export function createTrayHelpers(store){let pending=null;
  function reset(){pending=null}
  async function handle(input){const text=String(input||'').trim(),s=text.toLowerCase();if(!text)return null;
    if(/^(cancel|never mind|nevermind|stop that)$/i.test(s)&&pending){reset();return 'Canceled the pending activity.'}
    if(!pending&&(/\b(?:drank|drink|had)\s+(?:some\s+)?water\b/i.test(s)||/\blog\s+(?:my\s+)?water\b/i.test(s))){pending={type:'water',amount:null,unit:'container',when:null};const q=qty(s);if(q)Object.assign(pending,q);const tm=s.match(/\b(?:now|\d+\s*(?:minutes?|mins?|hours?|hrs?)\s+ago)\b/i);if(tm)pending.when=parseWhen(tm[0]);return next()}
    if(!pending){const m=s.match(/^(?:what(?:'s| is)\s+)?(\d+(?:\.\d+)?)\s*([+*/×÷-])\s*(\d+(?:\.\d+)?)\s*\??$/);if(m){const a=Number(m[1]),b=Number(m[3]),v=({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'×':()=>a*b,'/':()=>a/b,'÷':()=>a/b}[m[2]])();return Number.isFinite(v)?`${a} ${m[2]} ${b} = ${v}`:'Cannot divide by zero.'}return null}
    if(/^(yes|yep|yeah|confirm|save it|do it|correct|that's right)$/i.test(s)){
      if(!pending.amount||!pending.when)return next();const p=pending;reset();const d=p.when;const record={id:globalThis.crypto?.randomUUID?.()||`tray-${Date.now()}`,type:'water',title:`Drank ${p.amount} ${p.unit}${p.amount===1?'':'s'} of water`,date:localDate(d),time:localTime(d),startedAt:d.toISOString(),quantity:p.amount,quantityUnit:p.unit,source:'tray',needsReview:false,createdAt:Date.now(),updatedAt:Date.now()};
      try{await store.upsert('activityLogs',record);return `Saved: ${record.title} at ${record.time} on ${record.date}.`}
      catch(err){pending=p;return `I couldn't save the activity: ${err.message}. Nothing was confirmed saved. You can retry by saying yes.`}
    }
    if(/^(no|nope)$/i.test(s)){reset();return 'Canceled. Nothing was saved.'}
    const q=qty(s);if(q){pending.amount=q.amount;pending.unit=q.unit}
    const when=parseWhen(s);if(when)pending.when=when;
    return next();
  }
  function next(){if(!pending.amount)return 'How much water did you drink? For example, 1 container.';if(!pending.when)return `Got it — ${pending.amount} ${pending.unit}${pending.amount===1?'':'s'}. When did you drink it? You can say “now” or “5 minutes ago.”`;return `Log ${pending.amount} ${pending.unit}${pending.amount===1?'':'s'} of water at ${localTime(pending.when)} on ${localDate(pending.when)}? Say yes to save or no to cancel.`}
  return {handle,reset};
}
