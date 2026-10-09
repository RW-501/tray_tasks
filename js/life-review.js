import {ownerUid} from './private-config.js';
import {firebaseConfig} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig);
import {store} from './store.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js';
const $=id=>document.getElementById(id);
const modal=()=>bootstrap.Modal.getOrCreateInstance($('v10ReviewModal'));
$('v10OpenReview')?.addEventListener('click',()=>modal().show());
$('v10Copy')?.addEventListener('click',()=>navigator.clipboard.writeText($('v10Result').textContent||''));
async function prepareImage(file){if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Unsupported image type');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const out=canvas.toDataURL('image/jpeg',.78);bitmap.close();if(out.length>4500000)throw Error('Image is too large');return out;}
$('v10Analyze')?.addEventListener('click',async()=>{const button=$('v10Analyze');button.disabled=true;$('v10Status').textContent='Analyzing…';try{const user=getAuth(app).currentUser;if(!user||user.uid!==ownerUid)throw Error('Private sign-in required');const context={};if($('v10IncludeContext').checked){for(const name of ['tasks','goals','projects','habits','activityLogs','dailyBlocks'])context[name]=(store.data?.[name]||[]).slice(-30).map(x=>({title:x.title||x.name,date:x.date,completed:x.completed,frequency:x.frequency,notes:String(x.notes||x.details||'').slice(0,240)}));}const imageData=await prepareImage($('v10Image').files[0]);const fn=httpsCallable(getFunctions(app,'us-central1'),'privateLifeReview');const response=await fn({topic:$('v10Topic').value,note:$('v10Question').value,context,imageData});$('v10Result').textContent=response.data.review;$('v10Status').textContent='Review complete. Copy suggestions or apply them manually.';}catch(e){$('v10Status').textContent='Analysis failed: '+(e.message||e.code); }finally{button.disabled=false;}});
