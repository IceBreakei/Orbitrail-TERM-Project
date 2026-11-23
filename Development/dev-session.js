// Development preferences survive reloads for this tab only. Never replay one-shot test actions.
(() => {
  const key=`orbitrail:dev-settings:${location.pathname}`,marker=`${key}:code-reload`;
  const read=name=>{try{return JSON.parse(sessionStorage.getItem(name));}catch{return null;}};
  const write=(name,value)=>{try{sessionStorage.setItem(name,JSON.stringify(value));}catch{}};
  const saved=read(key);try{sessionStorage.removeItem(marker);}catch{}
  const roots=['.test-toolbar','.admin-panel','.admin-test-sidebar','.playtest-sidebar','#npc-tools','#sprite-tester'];
  const selector=roots.flatMap(root=>['input','select','textarea'].map(tag=>`${root} ${tag}`)).join(', ');
  const controls=()=>[...document.querySelectorAll(selector)].filter(el=>!['file','password','button','submit','reset','hidden'].includes(el.type)&&el.name!=='npc-selection');
  const identity=el=>{if(el.id)return `id:${el.id}`;const scope=el.closest?.('form,fieldset,[id]')?.id||'',data=Object.entries(el.dataset||{}).map(([k,v])=>`${k}=${v}`).join('|');return `control:${scope}:${el.name||data||el.getAttribute?.('aria-label')||controls().indexOf(el)}`;};
  const buttonSelector=['[data-character]',...roots.map(root=>`${root} button[aria-pressed]`)].join(', ');
  const buttons=()=>[...document.querySelectorAll(buttonSelector)].filter(el=>!['enter-fullscreen-preview','pause-game'].includes(el.id));
  const buttonKey=el=>el.id||`character:${el.dataset.character}`;
  const panelSelector='details.admin-panel, .admin-panel details, .admin-test-sidebar details, .playtest-sidebar details, #npc-tools, #player-stats-panel, #sprite-tester';
  function snapshot(){return {statDefaultsVersion:1,controls:Object.fromEntries(controls().map(el=>[identity(el),{value:el.value,checked:el.checked}])),buttons:Object.fromEntries(buttons().map(el=>[buttonKey(el),el.getAttribute('aria-pressed')])),panels:[...document.querySelectorAll(panelSelector)].map(el=>({id:el.id,index:[...document.querySelectorAll('details')].indexOf(el),open:el.open})),adminOpen:!document.querySelector('#admin-panel')?.hidden,runtime:window.getDevRuntimeSettings?.()};}
  let restoring=false,queued=false,initialized=false;
  function persist(){if(initialized&&!restoring)write(key,snapshot());}
  function schedule(){if(!initialized||restoring||queued)return;queued=true;setTimeout(()=>{queued=false;persist();},0);}
  // A task runs after the entire native event dispatch (capture microtasks may run before target handlers).
  for(const event of ['input','change','click','toggle'])document.addEventListener(event,schedule,true);
  window.saveDevSession=persist;
  window.addEventListener('pagehide',persist);
  window.addEventListener('beforeunload',persist);
  const NativeSocket=window.WebSocket;
  if(NativeSocket)window.WebSocket=class extends NativeSocket{constructor(...args){super(...args);this.addEventListener('message',event=>{let message;try{message=JSON.parse(event.data);}catch{}if(event.data==='reload'||message?.type==='full-reload')persist();});}};
  window.restoreDevSession=()=>{
    if(initialized)return;
    if(!saved){initialized=true;persist();return;}
    restoring=true;
    try{
      for(const el of buttons()){const target=saved.buttons?.[buttonKey(el)];if(target!=null&&(!el.dataset.character||target==='true'))for(let attempt=0;attempt<3&&target!==el.getAttribute('aria-pressed');attempt++)el.click();}
      for(const el of controls()){
        const state=saved.controls?.[identity(el)]||(el.name?saved.controls?.[`name:${el.name}`]:null);if(!state)continue;
        if(!saved.statDefaultsVersion&&el.dataset?.combatStat==='critPercent')continue;
        if(el.tagName==='SELECT'&&![...el.options].some(option=>option.value===state.value))continue;
        el.value=state.value;if(el.type==='checkbox'||el.type==='radio')el.checked=state.checked;
        el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
      }
      // Form handlers can reset runtime values; restore loadouts after those handlers.
      window.applyDevRuntimeSettings?.(saved.runtime);
      for(const panel of saved.panels||[]){const el=panel.id?document.getElementById(panel.id):document.querySelectorAll('details')[panel.index];if(el)el.open=panel.open;}
      const admin=document.querySelector('#admin-panel');if(admin&&(!admin.hidden)!==saved.adminOpen)document.querySelector('#admin-tools').click();
      initialized=true;
    }finally{restoring=false;persist();}
  };
})();
