(() => {
  const manual=document.currentScript.hasAttribute('data-game-loading');
  let completed=0,total=1,loaded=false,finished=false,screen,bar,label;
  const tasks=new Set();
  function render() {
    const percent=finished?100:Math.min(95,Math.round(completed/Math.max(1,total)*95));
    if(bar){bar.style.width=percent+'%';screen.setAttribute('aria-valuenow',percent);label.textContent=percent+'%';}
  }
  function track(promise) {
    total++;const task=Promise.resolve(promise);tasks.add(task);render();
    task.then(settle,settle);
    function settle(){completed++;tasks.delete(task);render();if(loaded&&!manual&&!tasks.size)finish();}
    return task;
  }
  function finish() {
    if(finished)return;finished=true;render();
    if(screen){screen.classList.add('is-ready');setTimeout(()=>screen.remove(),350);}
  }
  function fail(message) {
    if(!screen)return;
    screen.querySelector('.loading-caption').textContent=message||'Unable to load. Please reload to try again.';
    const button=document.createElement('button');button.textContent='Reload';button.onclick=()=>location.reload();screen.append(button);
  }
  window.pageLoading={track,finish,fail};
  document.addEventListener('DOMContentLoaded',()=>{
    screen=document.createElement('div');screen.className='archive-loading';
    screen.setAttribute('role','progressbar');screen.setAttribute('aria-label','Loading page');screen.setAttribute('aria-valuemin','0');screen.setAttribute('aria-valuemax','100');
    screen.innerHTML='<div class="loading-grid"></div><div class="loading-emblem" aria-hidden="true"><span></span></div><div class="loading-brand">OPERATION <strong>ORBITRAIL</strong></div><div class="loading-bottom"><div class="loading-heading"><span>NOW LOADING<span class="loading-dots">...</span></span><span class="loading-percent">0%</span></div><div class="loading-track"><div class="loading-fill"></div></div><p class="loading-caption">Connecting to S.C.H.A.L.E.</p></div>';
    document.body.append(screen);bar=screen.querySelector('.loading-fill');label=screen.querySelector('.loading-percent');render();
    for(const img of document.images)if(!img.complete)track(new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}));
    if(finished){screen.remove();}
  },{once:true});
  window.addEventListener('load',()=>{loaded=true;completed++;render();if(!manual&&!tasks.size)finish();},{once:true});
})();
