/* Web Viewer: opt-in link interception, no data access or page scripting. */
(()=>{'use strict';
 const $=s=>document.querySelector(s), modal=$('#ccWebViewerModal');if(!modal)return;
 const frame=$('#ccWebFrame'),address=$('#ccWebAddress'),status=$('#ccWebStatus'),help=$('#ccWebHelp'),empty=$('#ccWebEmpty');
 const key='tray-web-bookmarks-v1';let bookmarks=[];try{bookmarks=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(bookmarks))bookmarks=[]}catch{}
 let history=[],cursor=-1,current='';
 const http=(s)=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
 const normalize=(value)=>{let s=String(value||'').trim();if(!s)return null;let url=http(s);if(url)return url;if(/^(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(s))return http('http://'+s);if(/^[\w-]+(?:\.[\w-]+)+(?:[:/]\S*)?$/i.test(s))return http('https://'+s);return 'https://www.google.com/search?q='+encodeURIComponent(s)};
 function embedUrl(url){try{const u=new URL(url);if(u.hostname==='youtu.be'){const id=u.pathname.slice(1);if(/^[A-Za-z0-9_-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id}if(/^(www\.)?youtube\.com$/.test(u.hostname)&&u.pathname==='/watch'){const id=u.searchParams.get('v');if(/^[A-Za-z0-9_-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id}}catch{}return url}
 function display(url){current=url;address.value=url;empty.classList.add('d-none');frame.classList.remove('d-none');help.classList.remove('d-none');status.textContent='Opening preview… Embedded access depends on the website.';frame.src=embedUrl(url);$('#ccWebBack').disabled=cursor<=0;$('#ccWebForward').disabled=cursor>=history.length-1;$('#ccWebBookmark').querySelector('i').className=bookmarks.includes(url)?'bi bi-star-fill':'bi bi-star';}
 function open(value,{push=true}={}){const url=normalize(value);if(url&&window.CommandCenterMedia&&/(?:youtu\.be|youtube\.com\/watch|youtube\.com\/shorts|open\.spotify\.com\/(?:track|album|playlist|episode|show)|twitch\.tv\/[^/]+|wikipedia\.org\/wiki\/)/i.test(url)){return window.CommandCenterMedia.open(url)}if(!url){status.textContent='Enter a valid website or search term.';return false}if(new URL(url).origin===location.origin){status.textContent='For safety, Command Center pages cannot be embedded inside themselves.';return false}if(push){history=history.slice(0,cursor+1);history.push(url);cursor=history.length-1}display(url);bootstrap.Modal.getOrCreateInstance(modal).show();return true}
 function renderBookmarks(){const el=$('#ccWebBookmarks');el.replaceChildren(new Option('Bookmarks',''));bookmarks.forEach(u=>el.add(new Option((()=>{try{return new URL(u).hostname}catch{return u}})(),u)));}
 function searchYouTube(query){return open('https://www.youtube.com/results?search_query='+encodeURIComponent(query));}
 function interpret(text){const s=String(text||'').trim();let m;
  if(m=s.match(/(?:show|find|play|pull up|search for)\s+(?:me\s+)?(?:the\s+)?(?:latest|newest|recent)\s+(.+?)\s+(?:youtube\s+)?video(?:s)?(?:\s+on youtube)?[.!?]*$/i)){searchYouTube(m[1]+' latest official video');return 'I opened a YouTube search for the latest '+m[1]+' video in Web Viewer. I cannot verify which upload is newest without a YouTube search API, and YouTube may block the embedded results page. Use Open in new tab if needed.'}
  if(m=s.match(/(?:show|find|play|pull up|search for)\s+(?:me\s+)?(.+?)\s+(?:youtube\s+)?video(?:s)?(?:\s+on youtube)?[.!?]*$/i)){searchYouTube(m[1]);return 'I opened YouTube results for '+m[1]+'. Select a video there; if the site blocks embedding, open it in a new tab.'}
  if(m=s.match(/^(?:open|show|go to|browse|navigate to)\s+(?:the\s+)?(?:website\s+)?(.+)$/i)){const v=m[1].trim().replace(/[.!]$/,'');if(/^(?:my )?(?:task|goal|calendar|notes?|settings)\b/i.test(v))return null;const map={'facebook':'https://www.facebook.com/','wikipedia':'https://www.wikipedia.org/','google':'https://www.google.com/','youtube':'https://www.youtube.com/'};const target=map[v.toLowerCase()]||v;if(open(target))return 'Opening '+v+' in Web Viewer. Some sites restrict embedded viewing; use Open in new tab if the preview is blank.'}
  if(m=s.match(/^(?:search|look up|google)\s+(?:the web for\s+|for\s+)?(.+)$/i)){open('https://www.google.com/search?q='+encodeURIComponent(m[1]));return 'I opened a web search for '+m[1]+'. Google may not allow the results inside an embedded frame.'}
  return null;
 }
 $('#ccWebNavBtn')?.addEventListener('click',()=>bootstrap.Modal.getOrCreateInstance(modal).show());
 $('#ccWebForm').addEventListener('submit',e=>{e.preventDefault();open(address.value)});
 $('#ccWebBack').addEventListener('click',()=>{if(cursor>0){cursor--;display(history[cursor])}});
 $('#ccWebForward').addEventListener('click',()=>{if(cursor<history.length-1){cursor++;display(history[cursor])}});
 $('#ccWebReload').addEventListener('click',()=>{if(current){frame.src='about:blank';frame.src=embedUrl(current)}});
 $('#ccWebExternal').addEventListener('click',()=>{if(current)window.open(current,'_blank','noopener,noreferrer')});
 $('#ccWebBookmark').addEventListener('click',()=>{if(!current)return;bookmarks=bookmarks.includes(current)?bookmarks.filter(x=>x!==current):[...bookmarks,current].slice(-50);localStorage.setItem(key,JSON.stringify(bookmarks));renderBookmarks();display(current)});
 $('#ccWebBookmarks').addEventListener('change',e=>{if(e.target.value)open(e.target.value);e.target.value=''});
 frame.addEventListener('load',()=>{status.textContent='Preview loaded or blocked by the website. If blank, use Open in new tab.'});
 modal.addEventListener('hidden.bs.modal',()=>{frame.src='about:blank';status.textContent='Preview paused when closed.'});
 modal.addEventListener('shown.bs.modal',()=>{if(current&&frame.src==='about:blank')frame.src=embedUrl(current)});
 document.addEventListener('click',e=>{const direct=e.target.closest('[data-cc-web]');if(direct){e.preventDefault();open(direct.dataset.ccWeb);return}const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 // Only user-generated content links. App navigation and download links are untouched.
 if(!a.closest('.linkified, .note-item, .notes-list, #viewBody, .assistant-messages'))return;
 if(a.hasAttribute('download'))return;const url=http(a.href);if(!url||new URL(url).origin===location.origin)return;e.preventDefault();e.stopPropagation();open(url);
 },true);
 renderBookmarks();window.commandCenterWeb={open,interpret,searchYouTube};
})();
