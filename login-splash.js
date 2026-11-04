/** Rotate the login art without disturbing the form or its diagonal background fade. */
function startLoginSplash() {
  const container=document.querySelector('.login-splash');
  if(!container)return;
  const images=[...container.querySelectorAll('img')];
  let current=0,timer=null,transitioning=false;

  /** Fade the next decoded image in from the right over the still-visible current artwork. */
  function showNext() {
    if(document.hidden||transitioning)return;
    const next=(current+1)%images.length;
    if(!images[next].complete||!images[next].naturalWidth)return;
    transitioning=true;
    images[next].classList.add('is-entering');
  }

  /** Promote the incoming layer only after its reveal finishes, avoiding a blank frame. */
  container.addEventListener('animationend',event=>{
    if(!event.target.classList.contains('is-entering'))return;
    images[current].classList.remove('is-current');
    current=images.indexOf(event.target);
    images[current].classList.add('is-current');
    images[current].classList.remove('is-entering');
    transitioning=false;
  });

  /** Restart the ten-second interval after returning to the tab; never queue missed changes. */
  function resume() {
    clearInterval(timer);
    if(!document.hidden)timer=setInterval(showNext,10000);
  }
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('pagehide',()=>clearInterval(timer));
  window.addEventListener('pageshow',resume);
  // Decode up front so a large splash cannot flash or stall when first revealed.
  Promise.allSettled(images.map(image=>image.decode())).then(resume);
}

startLoginSplash();
