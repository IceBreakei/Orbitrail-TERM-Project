const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let output;
const c=vm.createContext({document:{createElement:()=>({getContext:()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray([255,255,255,255,40,20,45,255])}},putImageData(data){output=data.data}})})}});
vm.runInContext(fs.readFileSync('Development/bitmap-font.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/bitmap-font.js'"),c);
const text='Gain 51% damage and 22.3% critical chance for 25 seconds. Hits every 0.6 seconds; unlimited piercing.';
c.text=text;const ranges=vm.runInContext('statHighlightRanges(text)',c),marked=ranges.map(r=>text.slice(r.start,r.end).trim());
for(const expected of ['51%','22.3%','critical chance','25','seconds','0.6','unlimited piercing'])assert(marked.includes(expected));
vm.runInContext('yellowGlyph({}, {x:0,y:0,width:2,height:1},"font2","A")',c);
assert.deepEqual([...output],[255,225,90,255,40,20,45,255]);
console.log('PASS: important stats/effects highlighted and dark bitmap outlines preserved.');
