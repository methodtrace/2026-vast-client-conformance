const PERCENTAGE_FACTOR=100, s2ms=s=>s*1000;
const isPercentage=o=>/^\d+(\.\d+)?%$/g.test(o)&&!isNaN(parseFloat(o));
const isValid=({offset,uri})=>(typeof offset==='number'||Boolean(offset&&isPercentage(offset)))&&typeof uri==='string'&&uri.length>0;
const offsetToMs=(o,d)=>typeof o==='number'?o:(parseFloat(o)/PERCENTAGE_FACTOR)*d;
function onProgress({videoElement},cb,{progressEvents=[]}={}){
  const {duration}=videoElement; const durationInMs=s2ms(duration);
  let playedMs=0; let prev=s2ms(videoElement.currentTime);
  let pending=progressEvents.filter(isValid).map(({offset,uri})=>({offset:offsetToMs(offset,durationInMs),uri}));
  console.log('pending after construction:', JSON.stringify(pending));
  const h=()=>{const {currentTime}=videoElement; const d=Math.abs(currentTime-prev); playedMs+=s2ms(d); prev=currentTime;
    const call=[],still=[]; for(const e of pending){(typeof e.offset==='number'&&playedMs>=e.offset?call:still).push(e);} pending=still;
    call.forEach(({uri})=>cb('progress',{uri,playedMs})); if(!pending.length) videoElement.listeners=[];};
  if(pending.length) videoElement.listeners.push(h);
}
// Video element before src set: duration NaN, currentTime 0 (HTMLMediaElement defaults)
const v={duration:NaN,currentTime:0,listeners:[]};
onProgress({videoElement:v},(e,d)=>console.log('FIRED',e,d),{progressEvents:[{offset:'80%',uri:'https://t/80'},{offset:5000,uri:'https://t/5s'}]});
// simulate metadata load (duration 30s) then playback timeupdates
v.duration=30; for(let t=0.25;t<=30;t+=0.25){v.currentTime=t; v.listeners.forEach(f=>f());}
console.log('remaining listeners:', v.listeners.length);
