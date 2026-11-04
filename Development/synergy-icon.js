const imageCache=new Map();
/** Load the original PNGs once; compose crossed icons directly instead of embedding SVG images. */
export function drawSynergyIcon(canvas,item,isCurrent=()=>true) {
  if(item?.id!=='princess-key')return false;
  const layers=[
    {id:'aris-laser',name:'Arisu',angle:-Math.PI/4,color:'#65cfff',crop:[138,12,678,217]},
    {id:'luminous-nova',name:'Kei',angle:Math.PI/4,color:'#ff71d5',crop:[130,2,716,226]}
  ];
  layers.sort((a,b)=>Number(a.id===item.synergyTopWeaponId)-Number(b.id===item.synergyTopWeaponId));
  Promise.all(layers.map(layer=>{
    const source=`../sprites/attacks/Weapon_Icon_${layer.name}.png`;
    if(!imageCache.has(source)) {
      const image=new Image();image.src=source;
      imageCache.set(source,image.decode().then(()=>image));
    }
    return imageCache.get(source);
  })).then(images=>{
    if(!isCurrent())return;
    const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);
    layers.forEach((layer,index)=>{
      const [x,y,width,height]=layer.crop;
      const bound=(width+height)/Math.SQRT2,scale=canvas.width*.86/bound;
      context.save();context.translate(canvas.width/2,canvas.height/2);context.rotate(layer.angle);
      context.shadowColor=layer.color;
      // Icons are composed once: layered silhouette glows remain vivid at small HUD sizes.
      for(const blur of [.09,.045,0]) {
        context.shadowBlur=canvas.width*blur;
        context.drawImage(images[index],x,y,width,height,-width*scale/2,-height*scale/2,width*scale,height*scale);
      }
      context.restore();
    });
  }).catch(()=>{});
  return true;
}
