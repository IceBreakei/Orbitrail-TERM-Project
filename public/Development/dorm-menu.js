import { spriteLayouts } from './sprite-layouts.js';
import { createBitmapText } from './bitmap-font.js';
const furniture=[{x:90,y:335,w:280,h:85},{x:935,y:330,w:255,h:90},{x:548,y:455,w:160,h:65}];
function free(x,y){return x>=65&&x<=1215&&y>=335&&y<=660&&!furniture.some(r=>x>r.x-28&&x<r.x+r.w+28&&y>r.y-15&&y<r.y+r.h+20);}
export function stepDormResident(resident,delta,random=Math.random){
 const dt=Math.max(0,Math.min(.05,delta));resident.elapsed+=dt;if(resident.wait>0){resident.wait-=dt;resident.moving=false;return;}
 if(!resident.target){for(let i=0;i<32;i++){const point={x:80+random()*1120,y:345+random()*300};if(free(point.x,point.y)){resident.target=point;break;}}if(!resident.target){resident.wait=.5;return;}}
 const dx=resident.target.x-resident.x,dy=resident.target.y-resident.y,distance=Math.hypot(dx,dy),step=resident.speed*dt;if(distance<step+3){resident.target=null;resident.wait=1+random()*2;resident.moving=false;return;}
 const x=resident.x+dx/distance*step,y=resident.y+dy/distance*step;if(!free(x,y)){resident.target=null;resident.wait=.4+random();resident.moving=false;return;}resident.x=x;resident.y=y;resident.moving=true;const sector=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;resident.row=[6,7,0,1,2,3,4,5][sector];
}
export function createDormMenu({panel,onBack}){
 const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');let active=false,frame=null,last;
 const residents=['plana','arona'].map((id,i)=>({id,x:460+i*320,y:545-i*120,speed:54+i*8,wait:i*.9,elapsed:i*1.3,row:0,moving:false,target:null,image:null}));
 let loading;function load(){return loading??=Promise.all(residents.map(resident=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{resident.image=image;resolve()};image.onerror=reject;image.src=`../sprites/${resident.id==='plana'?'Plana':'Arona'} Sprite Sheet.png`;}))).catch(()=>{panel.querySelector('[data-dorm-status]').textContent='Unable to load residents.';});}
 function label(node,value){const c=document.createElement('canvas');node.replaceChildren(c);createBitmapText(c,{variant:'font2',scale:1.3,wrap:false}).setText(value);}
 label(panel.querySelector('h1'),'DORM');label(panel.querySelector('[data-dorm-quit]'),'Quit');label(panel.querySelector('footer'),'RIGHT CLICK / SHIFT: Back');
 function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
 function plant(x,y){ctx.fillStyle='#678ab2';ctx.beginPath();ctx.ellipse(x,y+20,26,12,0,0,Math.PI*2);ctx.fill();rect(x-23,y-25,46,45,'#f3fbff');for(let i=0;i<7;i++){ctx.save();ctx.translate(x,y-25);ctx.rotate(i*.9);ctx.fillStyle=i%2?'#6dbfa8':'#3f9e9d';ctx.beginPath();ctx.ellipse(0,-23,10,34,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
 function room(){const wall=ctx.createLinearGradient(0,0,0,330);wall.addColorStop(0,'#e9f7ff');wall.addColorStop(1,'#b7d8ed');ctx.fillStyle=wall;ctx.fillRect(0,0,1280,330);rect(0,60,1280,8,'#80c7e9');rect(0,311,1280,20,'#659bc2');rect(0,331,1280,389,'#d6eaf5');for(let y=331;y<720;y+=65)for(let x=0;x<1280;x+=80)rect(x,y,79,64,(x/80+Math.floor((y-331)/65))%2?'#c7dfef':'#deeff8');
 // Wide windows, noticeboard and soft lighting above the lounge.
 rect(710,87,470,195,'#78b7db');for(let i=0;i<4;i++){const glass=ctx.createLinearGradient(0,95,0,270);glass.addColorStop(0,'#73c9f0');glass.addColorStop(1,'#def9ff');ctx.fillStyle=glass;ctx.fillRect(720+i*115,97,105,175);rect(736+i*115,110,6,140,'#e8fbff90');}rect(700,280,490,14,'#f3fcff');rect(110,113,370,155,'#79a9c7');rect(118,121,354,139,'#dde8d7');for(let i=0;i<4;i++){ctx.save();ctx.translate(145+i*78,142+(i%2)*24);ctx.rotate((i%2?.08:-.06));rect(0,0,60,76,['#ffddcf','#fff2bb','#c8e8ff','#dfd7f6'][i]);rect(9,12,42,3,'#94adc1');rect(9,24,35,3,'#b1bfd0');ctx.restore();}
 // Rounded-look sofa, shelves and central rug/table; residents avoid their footprints.
 rect(80,309,300,94,'#83b6db');rect(95,293,270,74,'#9acbe9');rect(85,355,290,50,'#c6e5f5');rect(76,337,34,70,'#719fc5');rect(346,337,34,70,'#719fc5');rect(110,406,15,17,'#486d94');rect(329,406,15,17,'#486d94');rect(122,310,78,46,'#d9f2ff');rect(235,310,78,46,'#b5c5e8');
 rect(935,280,255,125,'#edf8ff');rect(944,291,237,98,'#8eb7cf');for(let i=0;i<9;i++)rect(957+i*23,315+(i%2)*7,15,66-(i%2)*7,['#8bbecf','#ffcaaf','#b8abd9'][i%3]);rect(930,397,265,15,'#f8fdff');
 ctx.fillStyle='#a0c6df';ctx.beginPath();ctx.ellipse(630,523,227,93,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d6effb';ctx.lineWidth=5;ctx.stroke();rect(570,475,15,58,'#6e94b1');rect(680,475,15,58,'#6e94b1');ctx.fillStyle='#f3fbff';ctx.beginPath();ctx.ellipse(630,470,100,40,0,0,Math.PI*2);ctx.fill();rect(603,453,48,16,'#91bee1');rect(607,450,45,6,'#ffdeb6');plant(48,309);plant(1230,309);}
 function drawResident(r){if(!r.image)return;const layout=spriteLayouts[r.id],column=r.moving?Math.floor(r.elapsed*7)%5:0,row=r.row,x=layout.columnEdges[column],y=layout.rowEdges[column][row],w=layout.columnEdges[column+1]-x,h=layout.rowEdges[column][row+1]-y,foot=layout.footY?.[column]?.[row]??layout.rowEdges[column][row+1],scale=.65;ctx.fillStyle='#3a668e33';ctx.beginPath();ctx.ellipse(r.x,r.y+2,24,9,0,0,Math.PI*2);ctx.fill();ctx.drawImage(r.image,x,y,w,h,r.x-w*scale/2,r.y-(foot-y)*scale,w*scale,h*scale);}
 function tick(time){if(!active)return;const dt=last===undefined?0:Math.min(.05,(time-last)/1000);last=time;for(const r of residents)stepDormResident(r,dt);ctx.clearRect(0,0,1280,720);room();residents.slice().sort((a,b)=>a.y-b.y).forEach(drawResident);frame=requestAnimationFrame(tick);}
 function close(){active=false;panel.hidden=true;if(frame!==null)cancelAnimationFrame(frame);frame=null;last=undefined;onBack();}
 panel.querySelector('[data-dorm-quit]').addEventListener('click',close);panel.addEventListener('contextmenu',event=>{if(!active)return;event.preventDefault();event.stopImmediatePropagation();close();});
 return {get active(){return active;},open(){if(active)return;active=true;panel.hidden=false;last=undefined;load();frame=requestAnimationFrame(tick);panel.querySelector('[data-dorm-quit]').focus();},close,handleKey(event){if(['Escape','Shift'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();close();}}};
}
