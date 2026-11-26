export const releaseVersion='Alpha 1.0.0';
/** Same-origin window.open copies tab session credentials/guest marker into the new window. */
export function openGameWindow(url=window.location.href){
 const target=new URL(url,window.location.href);target.searchParams.set('popout','1');
 const popup=window.open(target.href,'orbitrail-game','popup=yes,width=1280,height=768,resizable=yes,scrollbars=no');
 if(popup)popup.focus();return popup;
}
export function setupGameWindow({releaseControls=()=>{},onDetachedChange=()=>{},developer=false,developmentLogin=false}={}){
 const live=document.documentElement.dataset.runtime==='live',popout=new URLSearchParams(location.search).get('popout')==='1';
 const toolbar=live?document.createElement('nav'):document.querySelector('.test-toolbar');if(!toolbar)return;
 if(live){toolbar.className='live-game-tools';toolbar.setAttribute('aria-label','Game controls');const version=document.createElement('span');version.textContent=releaseVersion;toolbar.append(version);if(developer||developmentLogin){const link=document.createElement('a');link.href=developer?'../Development/index.html':'../index.html?admin=1';link.textContent='Development';toolbar.append(link);}document.body.append(toolbar);}
 if(!popout){
 const button=document.createElement('button');button.id='pop-out-game';button.type='button';button.textContent='Pop out game';toolbar.append(button);
 const status=document.createElement('span');status.setAttribute('role','status');toolbar.append(status);
 let popup=null,watch=null,cover=null,previousInert=false;const main=document.querySelector('#development-content');
 function restore(){if(!cover)return;clearInterval(watch);watch=null;cover.remove();cover=null;main.inert=previousInert;document.body.classList.remove('game-detached');releaseControls();onDetachedChange(false);status.textContent='Game returned to this window.';window.focus?.();button.focus();}
 button.addEventListener('click',()=>{if(popup&&!popup.closed){popup.focus();return;}releaseControls();popup=openGameWindow();if(!popup){status.textContent='Allow pop-ups for this site to open the game window.';return;}
  previousInert=main.inert;main.inert=true;document.body.classList.add('game-detached');onDetachedChange(true);
  cover=document.createElement('section');cover.className='game-detached-cover';cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');cover.setAttribute('aria-label','Game popped out');
  const title=document.createElement('h1');title.textContent='Game popped out';const message=document.createElement('p');message.textContent='Your game is open in a separate window. Close it to return here automatically.';
  const focus=document.createElement('button');focus.type='button';focus.textContent='Focus game window';focus.onclick=()=>{if(popup&&!popup.closed)popup.focus();else restore();};cover.append(title,message,focus);document.body.append(cover);focus.focus();
  watch=setInterval(()=>{if(popup.closed)restore();},250);
 });
 window.addEventListener('focus',()=>{if(popup?.closed)restore();});
 window.addEventListener('keydown',event=>{if(cover){event.stopImmediatePropagation();if(!cover.contains(event.target))event.preventDefault();}},true);
 window.addEventListener('pagehide',()=>{if(watch)clearInterval(watch);});
 }
 if(popout||live){document.body.classList.add('fullscreen-preview','game-only');document.querySelector('#exit-fullscreen-preview').hidden=true;}
 if(live){document.body.classList.add('live-game');document.title='Operation Orbitrail | '+releaseVersion;document.querySelector('#development-content').hidden=false;}
}
