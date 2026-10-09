import { ownerUid } from './private-config.js';
export async function requirePrivateSession(app) {
  const api = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
  const auth = api.getAuth(app);
  await api.setPersistence(auth, api.browserLocalPersistence);
  const overlay=document.createElement('div'); overlay.id='privateGate';
  overlay.innerHTML=`<div class="private-card"><h2>Private Command Center</h2><p>Sign in using an authorized Firebase account.</p><button type="button" id="googleLogin">Continue with Google</button><form id="privateForm"><label>Email<input type="email" id="privateEmail" autocomplete="username" required></label><label>Password<input type="password" id="privatePassword" autocomplete="current-password" required></label><button type="submit">Sign in with email</button></form><hr><form id="phoneForm"><label>Phone number (include +1)<input type="tel" id="privatePhone" value="+1" required></label><button type="submit">Send SMS code</button></form><form id="codeForm" hidden><label>SMS code<input id="privateCode" inputmode="numeric" autocomplete="one-time-code" required></label><button type="submit">Verify code</button></form><div id="recaptcha-container"></div><p id="privateError" role="alert" aria-live="polite"></p></div>`;
  document.body.append(overlay);
  const msg=overlay.querySelector('#privateError');
  if(!ownerUid || ownerUid.startsWith('REPLACE_')){msg.textContent='Configure owner UID in js/private-config.js first.';throw Error('Owner UID not configured');}
  let confirmation;
  const recaptcha=new api.RecaptchaVerifier('recaptcha-container',{'size':'normal'},auth);
  const show=e=>{msg.textContent=e?.message||'Sign-in failed. Check Firebase providers, authorized domains, and account linking.'};
  overlay.querySelector('#googleLogin').onclick=async()=>{try{msg.textContent='Opening Google sign-in…';await api.signInWithPopup(auth,new api.GoogleAuthProvider());}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){try{await api.signInWithRedirect(auth,new api.GoogleAuthProvider());}catch(err){show(err);}}else show(e);}};
  overlay.querySelector('#privateForm').onsubmit=async e=>{e.preventDefault();try{msg.textContent='Signing in…';await api.signInWithEmailAndPassword(auth,overlay.querySelector('#privateEmail').value.trim(),overlay.querySelector('#privatePassword').value);}catch(err){show(err);}};
  overlay.querySelector('#phoneForm').onsubmit=async e=>{e.preventDefault();try{msg.textContent='Sending SMS code…';confirmation=await api.signInWithPhoneNumber(auth,overlay.querySelector('#privatePhone').value.trim(),recaptcha);overlay.querySelector('#codeForm').hidden=false;msg.textContent='Enter the verification code sent to your phone.';}catch(err){show(err);}};
  overlay.querySelector('#codeForm').onsubmit=async e=>{e.preventDefault();try{msg.textContent='Verifying…';await confirmation.confirm(overlay.querySelector('#privateCode').value.trim());}catch(err){show(err);}};
  return new Promise((resolve,reject)=>{let finished=false;api.onAuthStateChanged(auth,async user=>{if(finished)return;if(user?.uid===ownerUid){finished=true;overlay.remove();resolve(user);}else if(user){msg.textContent='This sign-in created or selected a different Firebase UID. Link this provider to your authorized account in Firebase Auth; access denied.';await api.signOut(auth);}},reject);});
}
