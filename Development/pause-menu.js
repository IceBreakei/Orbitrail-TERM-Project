import { createCharacterStatsPanel } from './character-stats-panel.js';
import { createBitmapText } from './bitmap-font.js';
import { ensurePlayerStats } from './player-stats.js';
import { planaSkillSettings } from './game-config.js';
import { drawSynergyIcon } from './synergy-icon.js';

/** Show live character stats while freezing gameplay, independently of preview size. */
export function createPauseMenu({ canvas, getPlayer, releaseControls, onPause = () => {}, isBlocked = () => false }) {
  const overlay = document.querySelector('#pause-menu');
  const resume = document.querySelector('#pause-resume');
  const pauseButton = document.querySelector('#pause-game');
  const statsPanel=createCharacterStatsPanel({root:document.querySelector('#pause-character-panel'),
    portrait:document.querySelector('#pause-portrait'),nameCanvas:document.querySelector('#pause-character-name'),
    rowsContainer:document.querySelector('#pause-stat-rows')});
  createBitmapText(document.querySelector('#pause-title'), { variant: 'font2', scale: 2 }).setText('PAUSED');
  const settings = document.querySelector('#pause-settings');
  const volume = document.querySelector('#pause-music-volume');
  const mainVolume = document.querySelector('#music-volume');
  const volumeValue = document.querySelector('#pause-volume-value');
  const volumeLabel=settings.querySelector('label');
  const labelGraphic=document.createElement('canvas'),valueGraphic=document.createElement('canvas');
  volumeLabel.replaceChildren(labelGraphic);volumeValue.replaceChildren(valueGraphic);
  createBitmapText(labelGraphic,{variant:'font2',scale:1.25,wrap:false}).setText('Music volume');
  const volumeText=createBitmapText(valueGraphic,{variant:'font2',scale:1.25,wrap:false});
  function updateVolumeText(){const text=`${volume.value}%`;volumeText.setText(text);volumeValue.setAttribute('aria-label',text);}
  updateVolumeText();
  let paused = false;
  let previousInert = [];
  const skillsPanel = document.querySelector('#pause-skills-panel');
  const skillsButton = document.querySelector('#pause-skills-open');
  const weaponDividers = [...skillsPanel.querySelectorAll('.pause-weapon-divider')];
  const browser=document.createElement('div');browser.className='pause-ex-browser';
  const weaponList=document.createElement('nav');weaponList.className='pause-ex-list';weaponList.setAttribute('aria-label','Weapon EX skills');
  const skillDetail=document.createElement('div');skillDetail.className='pause-ex-detail';
  const weaponButtons=[],skillArticles=[];let selectedSkill=0;
  const iconSources=['../sprites/attacks/plana umbrella.png','../sprites/attacks/Weapon_Icon_Arisu.png','../sprites/attacks/Weapon_Icon_Kei.png'];
  function selectSkill(index){selectedSkill=index;weaponButtons.forEach((button,i)=>{button.classList.toggle('selected',i===index);button.setAttribute('aria-pressed',String(i===index));skillArticles[i].hidden=i!==index;});}
  weaponDividers.forEach((divider,index)=>{
    const heading=divider.querySelector('h2'),name=heading.textContent.trim(),article=divider.querySelector('article');
    article.querySelector('div > p')?.remove(); // The diagram communicates the pattern without prose instructions.
    for(const title of article.querySelectorAll('h3'))if(title.textContent.trim()===name)title.remove();
    article.prepend(heading);skillArticles.push(article);skillDetail.append(article);
    const button=document.createElement('button');button.type='button';button.className='pause-ex-weapon';button.setAttribute('aria-label',name);
    const icon=document.createElement('canvas');icon.width=icon.height=96;icon.setAttribute('aria-hidden','true');
    const nameText=document.createElement('span');nameText.textContent=name;nameText.setAttribute('data-thin-text','');button.append(icon,nameText);
    if(index===3)drawSynergyIcon(icon,{id:'princess-key'});
    else {
      const image=new Image();image.onload=()=>{
        const crop=index===0?{x:100,y:228,width:68,height:304}:{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};
        const angle=(index===0?45:-45)*Math.PI/180,extent=(crop.width+crop.height)/Math.SQRT2,scale=86/extent;
        const context=icon.getContext('2d');context.save();context.translate(48,48);context.rotate(angle);
        context.drawImage(image,crop.x,crop.y,crop.width,crop.height,-crop.width*scale/2,-crop.height*scale/2,crop.width*scale,crop.height*scale);context.restore();
      };image.src=iconSources[index];
    }
    button.addEventListener('click',()=>selectSkill(index));
    button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=(index+(event.key==='ArrowDown'?1:-1)+weaponDividers.length)%weaponDividers.length;selectSkill(next);weaponButtons[next].focus();}});
    weaponButtons.push(button);weaponList.append(button);divider.remove();
  });
  skillsPanel.querySelector('.pause-skill-note')?.remove();browser.append(weaponList,skillDetail);skillsPanel.append(browser);selectSkill(0);
  const thinText = new Map();
  for (const element of skillsPanel.querySelectorAll('[data-thin-text]')) {
    const text = element.textContent;
    const graphic = document.createElement('canvas');
    element.replaceChildren(graphic);
    const renderer = createBitmapText(graphic, { variant: 'font2', scale: 1.5, outlineOverlap: 1, maxWidth: 320, wrap: element.tagName === 'P', highlightStats:element.tagName==='P' });
    renderer.setText(text);
    thinText.set(element, renderer);
    new ResizeObserver(() => renderer.setMaxWidth(Math.max(80, element.clientWidth))).observe(element);
  }
  // All pause actions share font2.png, consistent scale and a single-line baseline.
  for (const button of overlay.querySelectorAll('.pause-menu-card button, .pause-menu-card .pause-dev-link')) {
    const label = button.textContent.trim();
    const graphic = document.createElement('canvas');
    button.replaceChildren(graphic);
    button.setAttribute('aria-label', label);
    createBitmapText(graphic, { variant: 'font2', scale: 1.5, outlineOverlap: 1, wrap: false }).setText(label);
  }
  /** Update accessible bitmap copy without replacing its responsive canvas. */
  function setThinText(selector, text) {
    thinText.get(document.querySelector(selector)).setText(text);
  }

  /** Open the dedicated skill reference without resuming gameplay. */
  function showSkills(visible) {
    skillsPanel.hidden = !visible;
    document.querySelector('#pause-character-panel').hidden = visible;
    document.querySelector('.pause-menu-card').hidden = visible;
    skillsButton.setAttribute('aria-expanded', String(visible));
    (visible ? weaponButtons[selectedSkill] : skillsButton).focus({ preventScroll: true });
  }
  skillsButton.addEventListener('click', () => showSkills(true));
  document.querySelector('#pause-skills-back').addEventListener('click', () => showSkills(false));

  /** Refresh the selected weapon's reference and equipped state. */
  function refreshSkill() {
    const equipped = getPlayer().attackSlots?.some(item => item?.id === 'plana-umbrella');
    setThinText('#pause-skill-equipped', equipped ? 'Equipped' : "Available with Plana's Umbrella");
    setThinText('#pause-skill-effect',
      `Launches an open umbrella forward, clearing a path by knocking enemies aside and stunning them for ${planaSkillSettings.stunSeconds} seconds.`);

  }

  // Crop the same transparent umbrella pose used by the attack-slot icon.
  const skillIcon = document.querySelector('#pause-skill-icon').getContext('2d');
  const umbrellaImage = new Image();
  umbrellaImage.onload = () => {
    skillIcon.clearRect(0, 0, 160, 160);
    skillIcon.save();
    skillIcon.translate(80, 80);
    skillIcon.rotate(Math.PI / 4);
    skillIcon.drawImage(umbrellaImage, 100, 228, 68, 304, -13.6, -60.8, 27.2, 121.6);
    skillIcon.restore();
  };
  umbrellaImage.src = new URL('../sprites/attacks/plana umbrella.png', import.meta.url).href;

  /** Refresh values and the holographic portrait for the controlled character. */
  function refresh() {
    const character = ensurePlayerStats(getPlayer());
    statsPanel.update(character);
    document.querySelector('#pause-exit-preview').hidden = !document.body.classList.contains('fullscreen-preview');
    volume.value = mainVolume.value;
    updateVolumeText();
    volume.style.setProperty('--volume-fill', `${volume.value}%`);
    refreshSkill();
  }

  /** Preserve the session and prevent hidden developer controls changing it while paused. */
  function setPaused(enabled) {
    if (paused === enabled || (enabled && isBlocked())) return;
    paused = enabled;
    releaseControls();
    overlay.hidden = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (paused) {
      onPause();
      refresh();
      showSkills(false);
      settings.hidden = true;
      document.querySelector('#pause-settings-toggle').setAttribute('aria-expanded', 'false');
      const main = document.querySelector('#development-content');
      const layout = document.querySelector('.playtest-layout');
      const blocked = [...main.children].filter(element => element !== layout)
        .concat(document.querySelector('.playtest-sidebar'), document.querySelector('.skill-test-sidebar'), canvas, document.querySelector('#exit-fullscreen-preview'));
      previousInert = blocked.map(element => [element, element.inert]);
      for (const [element] of previousInert) element.inert = true;
      resume.focus({ preventScroll: true });
    } else {
      for (const [element, inert] of previousInert) element.inert = inert;
      previousInert = [];
      canvas.focus({ preventScroll: true });
    }
  }

  pauseButton.addEventListener('click', () => setPaused(true));
  resume.addEventListener('click', () => setPaused(false));
  /** Right-click backs out one menu level; at the pause root it resumes gameplay. */
  overlay.addEventListener('pointerdown', event => {
    if (event.button !== 2 || !paused) return;
    event.preventDefault();
    event.stopPropagation();
    if (!skillsPanel.hidden) showSkills(false);
    else if (!settings.hidden) {
      settings.hidden = true;
      document.querySelector('#pause-settings-toggle').setAttribute('aria-expanded', 'false');
      document.querySelector('#pause-settings-toggle').focus({ preventScroll: true });
    } else setPaused(false);
  });
  overlay.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); });
  document.querySelector('#pause-settings-toggle').addEventListener('click', event => {
    settings.hidden = !settings.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!settings.hidden));
  });
  volume.addEventListener('input', () => {
    mainVolume.value = volume.value;
    mainVolume.dispatchEvent(new Event('input', { bubbles: true }));
    updateVolumeText();
    volume.style.setProperty('--volume-fill', `${volume.value}%`);
  });
  document.querySelector('#pause-exit-preview').addEventListener('click', () => {
    setPaused(false);
    document.querySelector('#exit-fullscreen-preview').click();
  });
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.repeat || isBlocked()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setPaused(!paused);
  }, true);
  return { get paused() { return paused; } };
}
