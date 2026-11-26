// Source GIF wraps mid-cycle: frames8?12 restart a burst after the fade-out.
// Play only the initial burst through its blank frame, once per impact.
const frames=[{"source": "./generated/artillery-explosion/frame-0.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-1.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-2.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-3.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-4.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-5.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-6.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-7.png", "duration": 200}, {"source": "./generated/artillery-explosion/frame-8.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-9.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-10.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-11.png", "duration": 100}, {"source": "./generated/artillery-explosion/frame-12.png", "duration": 100}].slice(0,8);
export const artilleryExplosionDuration=frames.reduce((sum,f)=>sum+f.duration,0)/1000;
let images=[];
const ready=typeof Image==='undefined'?Promise.resolve():Promise.all(frames.map(f=>new Promise(resolve=>{
 const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=new URL(f.source,import.meta.url).href;
}))).then(result=>{images=result;});
export function drawArtilleryExplosion(context,camera,zone,elapsed){
 if(elapsed<0||elapsed>=artilleryExplosionDuration)return;
 let ms=elapsed*1000,index=0;while(index<frames.length-1&&ms>=frames[index].duration){ms-=frames[index].duration;index++;}
 const image=images[index];if(!image)return;
 const width=zone.radius*3,height=width*620/680;
 context.drawImage(image,zone.x-camera.x-width/2,zone.y-camera.y-height*.78,width,height);
}
export {ready as artilleryExplosionReady};
