/** Per-pickup protection after leaving a menu. Timers advance only on game time. */
export function createPickupReentryGuard(delay=1.5) {
  const blocks=new Map();
  return {
    block(key){blocks.set(key,{waitingToLeave:true,remaining:delay});},
    blocked(key,touching,delta=0){
      const state=blocks.get(key);if(!state)return false;
      if(touching){state.waitingToLeave=true;state.remaining=delay;return true;}
      // The first fully separated frame starts the delay; time spent overlapping never counts.
      if(state.waitingToLeave){state.waitingToLeave=false;return true;}
      state.remaining=Math.max(0,state.remaining-Math.max(0,Number.isFinite(delta)?delta:0));
      if(state.remaining>1e-8)return true;
      blocks.delete(key);return false;
    },
    forget(key){blocks.delete(key);},
    clear(){blocks.clear();}
  };
}
