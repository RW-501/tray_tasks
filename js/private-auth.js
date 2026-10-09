// Private session gate: enable Email/Password in Firebase Authentication.
import { ownerUid } from './private-config.js';
export async function requirePrivateSession(app) {
  const api = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
  const auth = api.getAuth(app);
  await api.setPersistence(auth, api.browserLocalPersistence);
  const overlay = document.createElement('div');
  overlay.id = 'privateGate';
  overlay.innerHTML = `<div class="private-card"><h2>Private Command Center</h2><p>Sign in to sync your private data across devices.</p><form id="privateForm"><label>Email<input type="email" id="privateEmail" autocomplete="username" required></label><label>Password<input type="password" id="privatePassword" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><p id="privateError" role="alert"></p></div>`;
  document.body.append(overlay);
  if (!ownerUid || ownerUid === 'REPLACE_WITH_YOUR_FIREBASE_AUTH_UID') {
    overlay.querySelector('#privateError').textContent = 'Setup required: configure owner UID and deploy restrictive Firebase rules before use.';
    overlay.querySelector('button').disabled = true;
    throw new Error('Owner UID not configured');
  }
  return new Promise((resolve,reject) => {
    let done=false;
    api.onAuthStateChanged(auth, async user => {
      if (done) return;
      if (user && user.uid === ownerUid) { done=true;overlay.remove();resolve(user); }
      else if (user) { await api.signOut(auth);overlay.querySelector('#privateError').textContent='This account is not authorized.'; }
    }, reject);
    overlay.querySelector('#privateForm').addEventListener('submit', async event => {
      event.preventDefault();
      const msg=overlay.querySelector('#privateError');msg.textContent='Signing in…';
      try { await api.signInWithEmailAndPassword(auth,overlay.querySelector('#privateEmail').value,overlay.querySelector('#privatePassword').value); }
      catch(err) {msg.textContent='Sign-in failed. Check your email and password.';}
    });
  });
}
