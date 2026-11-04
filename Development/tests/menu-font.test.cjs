const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({URL,Image:class{set src(value){this.url=value}}});
for(const name of ['font-metrics','font-thin-metrics','font2-metrics','font21-metrics','bitmap-font']) {
 let code=fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/bitmap-font.js'");vm.runInContext(code,c);
}
const canvas=()=>({style:{},setAttribute(){}});
c.canvas=canvas();
vm.runInContext("var title=createBitmapText(canvas,{variant:'font2',scale:1.5,maxWidth:80,wrap:false});title.setText(\"Plana's Umbrella\")",c);
assert.equal(c.canvas.height,30);
c.canvas=canvas();vm.runInContext("createBitmapText(canvas,{variant:'font2',scale:1.5,wrap:false}).setText('Resume')",c);assert.equal(c.canvas.height,30);
for(const name of ['font2Metrics','font21Metrics']){
 const cap=vm.runInContext(`${name}.A`,c),lower=vm.runInContext(`${name}.a`,c);
 assert(Math.abs((cap.offsetY+cap.height)-(lower.offsetY+lower.height))<=1);
 assert(vm.runInContext(`${name}.a.y!==${name}.A.y`,c));
}
console.log('PASS: updated-font2 single-line title/button heights and existing font metric bounds.');
