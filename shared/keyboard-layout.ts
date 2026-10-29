// ANSI 104-key layout in the existing 320 x 300 model coordinate system.
export interface KeyboardKey {id:string;vk:number;label:string;x:number;y:number;width:number;height:number}
const unit=13,startX=8,gap=1;
const keys:KeyboardKey[]=[];
function key(id:string,vk:number,label:string,column:number,y:number,width=1,height=9){keys.push({id,vk,label,x:startX+column*unit,y,width:width*unit-gap,height});}
function row(y:number,items:[number,string,number?][]){
  let column=0;for(const [vk,label,width=1] of items){key(`main-${vk}`,vk,label,column,y,width);column+=width;}
}
key('escape',27,'Esc',0,205,1,7);
for(let i=0;i<12;i++)key(`f${i+1}`,112+i,`F${i+1}`,2+i+Math.floor(i/4)*.5,205,1,7);
for(const [i,vk,label] of [[0,44,'PrtSc'],[1,145,'ScrLk'],[2,19,'Pause']] as const)key(`system-${vk}`,vk,label,15.5+i,205,1,7);
row(218,[[192,'`'],...[...`1234567890`].map(c=>[c.charCodeAt(0),c] as [number,string]),[189,'-'],[187,'='],[8,'Back',2]]);
row(229,[[9,'Tab',1.5],...[...`QWERTYUIOP`].map(c=>[c.charCodeAt(0),c] as [number,string]),[219,'['],[221,']'],[220,'\\',1.5]]);
row(240,[[20,'Caps',1.75],...[...`ASDFGHJKL`].map(c=>[c.charCodeAt(0),c] as [number,string]),[186,';'],[222,"'"],[13,'Enter',2.25]]);
row(251,[[160,'Shift',2.25],...[...`ZXCVBNM`].map(c=>[c.charCodeAt(0),c] as [number,string]),[188,','],[190,'.'],[191,'/'],[161,'Shift',2.75]]);
row(262,[[162,'Ctrl',1.25],[91,'Win',1.25],[164,'Alt',1.25],[32,'Space',6.25],[165,'Alt',1.25],[92,'Win',1.25],[93,'Menu',1.25],[163,'Ctrl',1.25]]);
for(const [y,items] of [[218,[[45,'Ins'],[36,'Home'],[33,'PgUp']]],[229,[[46,'Del'],[35,'End'],[34,'PgDn']]]] as [number,[number,string][]][])
  items.forEach(([vk,label],i)=>key(`nav-${vk}`,vk,label,15.5+i,y));
key('arrow-up',38,'↑',16.5,251);
[[37,'←'],[40,'↓'],[39,'→']].forEach(([vk,label],i)=>key(`arrow-${vk}`,+vk,String(label),15.5+i,262));
for(const [rowIndex,items] of [
  [[144,'Num'],[111,'/'],[106,'*'],[109,'-']],
  [[103,'7'],[104,'8'],[105,'9']],
  [[100,'4'],[101,'5'],[102,'6']],
  [[97,'1'],[98,'2'],[99,'3']],
].entries())items.forEach(([vk,label],i)=>key(`num-${vk}`,+vk,String(label),19+i,218+rowIndex*11));
key('num-add',107,'+',22,229,1,20);
key('num-enter',13,'Ent',22,251,1,20);
key('num-zero',96,'0',19,262,2);key('num-decimal',110,'.',21,262);
export const keyboardKeys:readonly KeyboardKey[]=keys;
const byVK=new Map<number,KeyboardKey>();
for(const k of keys)if(!byVK.has(k.vk))byVK.set(k.vk,k);
for(const [generic,left] of [[16,160],[17,162],[18,164]])byVK.set(generic,byVK.get(left)!);
export function keyForVK(vk:number){return byVK.get(vk);}
export function keyCenter(key:KeyboardKey){return {x:key.x+key.width/2,y:key.y+key.height/2};}
export const keyboardBounds={x:3,y:201,width:314,height:72};
export const pawHomes={left:{x:105,y:198},right:{x:215,y:198}};
// 2x model resolution by default makes the full set of legends readable.
export const petWindowSize={width:640,height:600};
