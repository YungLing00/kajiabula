const canvas=document.querySelector('#ocean');
const ctx=canvas.getContext('2d',{alpha:false});
const state={depth:.78,current:.35,purity:.78,jellies:.5,fish:.7,large:.75,trash:.18,life:.78,pad:.34,waves:.42,bell:.18,whales:.2,bubblesTrack:.16,currentTrack:.2,deepBass:.14,master:.55,wave:.3,speed:.45,chill:.7,light:.7,zoom:.55,playing:true,deep:false};
let W=0,H=0,DPR=1,t=0,last=performance.now(),mouseX=0,mouseY=0,toastTimer;
const ripples=[];let audio=null,audioPulse=0;
const creatures={fish:[],jelly:[],trash:[],bubbles:[],large:[]};
const rnd=(a,b)=>a+Math.random()*(b-a);
function createAudio(){
  if(audio)return audio;
  const A=new (window.AudioContext||window.webkitAudioContext)();
  const master=A.createGain(),compressor=A.createDynamicsCompressor(),reverb=A.createConvolver(),wet=A.createGain(),analyser=A.createAnalyser();
  master.gain.value=0;compressor.threshold.value=-18;compressor.knee.value=20;compressor.ratio.value=3;wet.gain.value=.38;analyser.fftSize=256;
  const impulse=A.createBuffer(2,A.sampleRate*5,A.sampleRate);
  for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.7)}
  reverb.buffer=impulse;reverb.connect(wet).connect(compressor);master.connect(analyser).connect(compressor).connect(A.destination);
  const tracks={};const bus=(name)=>{const g=A.createGain(),send=A.createGain();g.gain.value=0;send.gain.value=.52;g.connect(master);g.connect(send).connect(reverb);tracks[name]=g;return g};
  const pad=bus('pad'),waves=bus('waves'),bell=bus('bell'),whales=bus('whales'),bubble=bus('bubblesTrack'),current=bus('currentTrack'),deep=bus('deepBass');
  const noiseBuffer=A.createBuffer(1,A.sampleRate*6,A.sampleRate),nd=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<nd.length;i++){brown=(brown+.018*(Math.random()*2-1))/.998;nd[i]=brown*.42}
  const noise=(dest,type,freq,q=.7)=>{const src=A.createBufferSource(),fl=A.createBiquadFilter();src.buffer=noiseBuffer;src.loop=true;fl.type=type;fl.frequency.value=freq;fl.Q.value=q;src.connect(fl).connect(dest);src.start();return{src,fl}};
  const waveNoise=noise(waves,'lowpass',520),currentNoise=noise(current,'bandpass',1100,.55);
  const lfo=A.createOscillator(),lfoGain=A.createGain();lfo.frequency.value=.08;lfoGain.gain.value=260;lfo.connect(lfoGain).connect(waveNoise.fl.frequency);lfo.start();
  const delay=A.createDelay(2),feedback=A.createGain(),delayWet=A.createGain();delay.delayTime.value=.42;feedback.gain.value=.42;delayWet.gain.value=.32;bell.connect(delay);delay.connect(feedback).connect(delay);delay.connect(delayWet).connect(reverb);
  const chords=[[146.83,220,277.18,369.99],[123.47,185,246.94,329.63],[98,146.83,196,293.66],[110,164.81,220,277.18]];
  let chordIndex=0,nextChord=0,nextBell=0,nextBubble=0,nextWhale=0,nextBass=0;
  const voice=(dest,freq,start,duration,type='sine',level=.08,detune=0)=>{
    const o=A.createOscillator(),g=A.createGain(),fl=A.createBiquadFilter();o.type=type;o.frequency.value=freq;o.detune.value=detune;fl.type='lowpass';fl.frequency.value=1350;fl.Q.value=.3;
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+Math.min(.9,duration*.25));g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(fl).connect(g).connect(dest);o.start(start);o.stop(start+duration+.1);return o
  };
  const timer=setInterval(()=>{const now=A.currentTime;
    if(now>=nextChord){const chord=chords[chordIndex%chords.length];chord.forEach((hz,i)=>{voice(pad,hz,now,8.5,i%2?'sine':'triangle',.032,i*3-4);voice(pad,hz/2,now,8.5,'sine',.015,5-i*2)});chordIndex++;nextChord=now+7.8}
    if(now>=nextBell){const chord=chords[(chordIndex-1+chords.length)%chords.length],hz=chord[Math.floor(Math.random()*chord.length)]*[2,3,4][Math.floor(Math.random()*3)];voice(bell,hz,now,2.4,'sine',.07);voice(bell,hz*2.01,now,1.3,'sine',.018);nextBell=now+rnd(.8,2.2)}
    if(now>=nextBubble){const pan=A.createStereoPanner(),g=A.createGain(),o=A.createOscillator();pan.pan.value=rnd(-.8,.8);o.type='sine';o.frequency.setValueAtTime(rnd(540,920),now);o.frequency.exponentialRampToValueAtTime(rnd(1250,1900),now+.11);g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(.1,now+.018);g.gain.exponentialRampToValueAtTime(.001,now+.17);o.connect(g).connect(pan).connect(bubble);o.start(now);o.stop(now+.2);nextBubble=now+rnd(.28,.95)}
    if(now>=nextWhale){const o=voice(whales,rnd(88,118),now,5.8,'sine',.11),v=A.createOscillator(),vg=A.createGain();v.frequency.value=rnd(.25,.5);vg.gain.value=7;v.connect(vg).connect(o.frequency);v.start(now);v.stop(now+5.9);nextWhale=now+rnd(9,16)}
    if(now>=nextBass){const root=chords[(chordIndex-1+chords.length)%chords.length][0]/2;voice(deep,root,now,7.5,'sine',.055);voice(deep,root*2,now,7.5,'triangle',.012);nextBass=now+7.8}
    const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);audioPulse=data.reduce((s,v)=>s+v,0)/(data.length*255);
  },90);
  audio={A,master,tracks,waveFilter:waveNoise.fl,currentFilter:currentNoise.fl,analyser,timer};mixAudio();return audio;
}
async function startAudio(){createAudio();if(audio.A.state==='suspended')await audio.A.resume();mixAudio()}
function seed(){
  creatures.fish=Array.from({length:72},(_,i)=>({x:rnd(-.82,.82),y:rnd(-.65,.65),z:rnd(.2,1),s:rnd(.12,.3),phase:rnd(0,9),color:['#7ff6ff','#ffc978','#ef8dcc','#a8ffcf','#a6b7ff','#ffffff'][i%6]}));
  creatures.jelly=Array.from({length:28},()=>({x:rnd(-.8,.8),y:rnd(-.7,.65),z:rnd(.25,1),s:rnd(.5,1.15),phase:rnd(0,9)}));
  creatures.trash=Array.from({length:36},(_,i)=>({x:rnd(-.78,.78),y:rnd(-.65,.68),z:rnd(.3,1),phase:rnd(0,9),kind:i%3}));
  creatures.bubbles=Array.from({length:90},()=>({x:rnd(-.92,.92),y:rnd(-.9,.9),r:rnd(1,4),s:rnd(.03,.12),phase:rnd(0,9)}));
  creatures.large=[
    {type:'whale',x:-.35,y:.16,z:.9,s:.055,phase:1},
    {type:'dolphin',x:.35,y:-.18,z:.7,s:.11,phase:3},
    {type:'turtle',x:.12,y:.43,z:.62,s:.065,phase:5}
  ];
}seed();
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const sphere=()=>{const mobile=W<760;const r=Math.min(W,H)*(mobile?.35:.39)*(0.78+state.zoom*.28);return{x:mobile?W*.68:W*.71,y:mobile?H*.38:H*.47,r}};
function bg(){
  const healthy=state.purity*(1-state.trash);
  const g=ctx.createRadialGradient(W*.7,H*.45,20,W*.7,H*.45,Math.max(W,H)*.75);
  g.addColorStop(0,state.deep?'#03131d':healthy>.45?'#063948':'#25322d');g.addColorStop(.45,state.deep?'#020b13':'#041b25');g.addColorStop(1,'#01080d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.16+.2*state.light;
  for(let i=0;i<5;i++){const y=H*(.16+i*.16)+Math.sin(t*.6+i)*25;const ag=ctx.createLinearGradient(0,y,W,y+80);ag.addColorStop(0,'transparent');ag.addColorStop(.55,state.purity>.5?'#0e7180':'#6a493b');ag.addColorStop(1,'transparent');ctx.fillStyle=ag;ctx.fillRect(0,y,W,110)}
  ctx.globalAlpha=1;
}
function clipSphere(s){ctx.save();ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.clip()}
function dreamLight(s){
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<9;i++){const x=s.x-s.r+i*s.r*.25+Math.sin(t*.4+i)*28;const g=ctx.createLinearGradient(x,s.y-s.r,x+80,s.y+s.r);g.addColorStop(0,'rgba(190,255,255,.18)');g.addColorStop(.5,'rgba(78,211,244,.025)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-35,s.y-s.r);ctx.lineTo(x+38,s.y-s.r);ctx.lineTo(x+110,s.y+s.r);ctx.lineTo(x+30,s.y+s.r);ctx.fill()}
  for(let i=0;i<18;i++){const a=t*.12+i*2.4,r=s.r*(.15+(i%7)*.105),x=s.x+Math.cos(a+i)*r,y=s.y+Math.sin(a*1.3+i*1.7)*r*.72;const g=ctx.createRadialGradient(x,y,0,x,y,26);g.addColorStop(0,'rgba(188,255,245,.2)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-30,y-30,60,60)}
  ctx.restore();
}
function coral(s){ctx.save();ctx.translate(s.x,s.y+s.r*.78);ctx.globalAlpha=.52*state.life;for(let i=-7;i<=7;i++){const x=i*s.r*.105,y=Math.sin(i*1.9)*7;ctx.strokeStyle=['#f38fc1','#74e8d4','#a58df3','#f4bb78'][(i+8)%4];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-12,y-24,x+14,y-34,x+Math.sin(i)*8,y-58-Math.abs(i%3)*11);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x+Math.sin(i)*8,y-60-Math.abs(i%3)*11,4,0,7);ctx.fill()}ctx.restore()}
function drawWater(s){
  const health=state.purity*(1-state.trash);
  const water=ctx.createRadialGradient(s.x-s.r*.28,s.y-s.r*.3,s.r*.08,s.x,s.y,s.r);
  water.addColorStop(0,state.deep?'#0b455d':health>.4?'#179cb0':'#706049');water.addColorStop(.55,state.deep?'#062b3e':health>.4?'#07596f':'#3d4640');water.addColorStop(1,'#021621');
  ctx.fillStyle=water;ctx.fillRect(s.x-s.r,s.y-s.r,s.r*2,s.r*2);dreamLight(s);coral(s);
  const waterTop=s.y+s.r*(1-state.depth*2);
  ctx.globalAlpha=.22+.18*state.wave;ctx.strokeStyle='#b5f8ff';ctx.lineWidth=1.5;
  for(let j=0;j<7;j++){ctx.beginPath();for(let x=-s.r;x<=s.r;x+=12){const y=waterTop+j*18+Math.sin(x*.027+t*(1.5+state.current*3)+j)*7*state.wave+(x*x/(s.r*s.r))*j*2;if(x===-s.r)ctx.moveTo(s.x+x,y);else ctx.lineTo(s.x+x,y)}ctx.stroke()}
  ctx.globalAlpha=1;
}
function inside(s,x,y,z=1){return[s.x+x*s.r*.92,s.y+y*s.r*.86,z]}
function fish(s,f,i){
  const [x,y]=inside(s,f.x,f.y);const sc=(.35+f.z*.75)*s.r/300;ctx.save();ctx.translate(x,y+Math.sin(t*2+f.phase)*4);ctx.scale(sc,sc);ctx.fillStyle=f.color;ctx.globalAlpha=.48+f.z*.4;ctx.shadowColor=f.color;ctx.shadowBlur=7+audioPulse*18;ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha*=.65;ctx.strokeStyle='#eaffff';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-7,-2);ctx.quadraticCurveTo(0,2,8,-1);ctx.stroke();ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-22,-9);ctx.lineTo(-20,9);ctx.closePath();ctx.fill();ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(7,-1,1.4,0,7);ctx.fill();ctx.restore();
}
function jelly(s,j){
  const [x,y]=inside(s,j.x,j.y);const sc=j.s*s.r/330;ctx.save();ctx.translate(x,y+Math.sin(t*1.4+j.phase)*7);ctx.scale(sc,sc);ctx.globalAlpha=.38+.25*state.life;ctx.shadowColor='#91f8ff';ctx.shadowBlur=14;const g=ctx.createLinearGradient(0,-18,0,10);g.addColorStop(0,'#e9ffff');g.addColorStop(1,'#62dfe6');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,18,Math.PI,Math.PI*2);ctx.quadraticCurveTo(12,12,0,6);ctx.quadraticCurveTo(-12,12,-18,0);ctx.fill();ctx.strokeStyle='#bfffff';ctx.lineWidth=1.4;for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(k*6,6);ctx.bezierCurveTo(k*7+Math.sin(t*3+j.phase)*5,18,k*5-Math.sin(t*2+j.phase)*7,27,k*6,38);ctx.stroke()}ctx.restore();
}
function whale(s,o){
  const [x,y]=inside(s,o.x,o.y);const sc=s.r/370*(o.type==='whale'?1:o.type==='dolphin'?.62:.55);ctx.save();ctx.translate(x,y+Math.sin(t+o.phase)*9);ctx.scale(sc,sc);ctx.globalAlpha=.84;
  if(o.type==='turtle'){ctx.fillStyle='#70c6a7';ctx.beginPath();ctx.ellipse(0,0,28,18,0,0,7);ctx.fill();for(const [a,b] of [[-29,-16],[-29,16],[25,-15],[25,15]]){ctx.beginPath();ctx.ellipse(a,b,14,5,b<0?-.55:.55,0,7);ctx.fill()}ctx.beginPath();ctx.arc(31,0,7,0,7);ctx.fill()}
  else{ctx.fillStyle=o.type==='whale'?'#63aebe':'#8ad9e2';ctx.beginPath();ctx.moveTo(-42,0);ctx.bezierCurveTo(-15,-24,32,-18,48,0);ctx.bezierCurveTo(30,17,-18,19,-42,0);ctx.fill();ctx.beginPath();ctx.moveTo(-38,0);ctx.lineTo(-57,-17);ctx.lineTo(-52,0);ctx.lineTo(-58,17);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(6,8);ctx.lineTo(-6,28);ctx.lineTo(20,12);ctx.fill();ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(33,-5,2,0,7);ctx.fill()}
  ctx.restore();
}
function garbage(s,o){
  const [x,y]=inside(s,o.x,o.y);ctx.save();ctx.translate(x,y+Math.sin(t+o.phase)*5);ctx.rotate(Math.sin(t*.5+o.phase)*.4);ctx.globalAlpha=.3+state.trash*.65;ctx.fillStyle=o.kind===0?'#ef7672':o.kind===1?'#ded7b5':'#a4b7bd';if(o.kind===0){ctx.fillRect(-5,-11,10,22);ctx.strokeStyle='#fff9';ctx.strokeRect(-3,-8,6,13)}else if(o.kind===1){ctx.beginPath();ctx.moveTo(-9,-8);ctx.lineTo(9,-4);ctx.lineTo(6,9);ctx.lineTo(-7,7);ctx.closePath();ctx.fill()}else{ctx.strokeStyle='#cadde2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.stroke()}ctx.restore();
}
function drawRipples(s){ctx.save();ctx.clip();ripples.forEach((r,i)=>{r.a-=.018;r.r+=3.2;ctx.strokeStyle='rgba(190,255,255,'+Math.max(0,r.a)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.stroke()});for(let i=ripples.length-1;i>=0;i--)if(ripples[i].a<=0)ripples.splice(i,1);ctx.restore()}
function shell(s){
  const shine=ctx.createRadialGradient(s.x-s.r*.35,s.y-s.r*.4,0,s.x-s.r*.28,s.y-s.r*.32,s.r*1.25);shine.addColorStop(0,'rgba(220,255,255,.42)');shine.addColorStop(.12,'rgba(120,235,250,.05)');shine.addColorStop(.72,'rgba(40,190,220,.03)');shine.addColorStop(1,'rgba(110,235,250,.24)');
  ctx.fillStyle=shine;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();ctx.strokeStyle='rgba(163,246,255,.48)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#c5fbff';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(s.x,s.y,s.r-i*7,Math.PI*1.08,Math.PI*1.55);ctx.stroke()}ctx.restore();
}
function bubbles(s){
  ctx.strokeStyle='rgba(184,250,255,.38)';creatures.bubbles.forEach(b=>{b.y-=b.s*(state.playing?1:0);if(b.y<-.9)b.y=.9;const [x,y]=inside(s,b.x,b.y);ctx.beginPath();ctx.arc(x,y,b.r,0,7);ctx.stroke()});
}
function draw(){
  const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now;if(state.playing)t+=dt*(.35+state.speed*1.8)*(1.25-state.chill*.45);
  bg();const s=sphere();s.x+=(mouseX-W/2)*.018;s.y+=(mouseY-H/2)*.012;
  ctx.save();ctx.shadowColor=state.purity>.5?'#24dcee':'#b58b62';ctx.shadowBlur=55;ctx.fillStyle='rgba(8,96,112,.2)';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();ctx.restore();
  clipSphere(s);drawWater(s);
  creatures.bubbles.forEach(()=>{});bubbles(s);
  const fishCount=Math.floor(creatures.fish.length*state.fish);creatures.fish.slice(0,fishCount).forEach((f,i)=>{if(state.playing){f.x+=dt*f.s*(.5+state.current*2);if(f.x>.88)f.x=-.88}fish(s,f,i)});
  creatures.jelly.slice(0,Math.floor(creatures.jelly.length*state.jellies)).forEach(j=>{if(state.playing){j.y-=dt*.025*(.4+state.current);if(j.y<-.76)j.y=.74}jelly(s,j)});
  creatures.large.slice(0,Math.ceil(creatures.large.length*state.large)).forEach(o=>{if(state.playing){o.x+=dt*o.s;if(o.x>.72)o.x=-.72}whale(s,o)});
  creatures.trash.slice(0,Math.floor(creatures.trash.length*state.trash)).forEach(o=>garbage(s,o));
  ctx.restore();shell(s);drawRipples(s);
  requestAnimationFrame(draw);
}
addEventListener('pointermove',e=>{mouseX=e.clientX;mouseY=e.clientY;const s=sphere(),dx=(e.clientX-s.x)/s.r,dy=(e.clientY-s.y)/s.r;if(dx*dx+dy*dy<1){creatures.fish.forEach(f=>{const fx=s.x+f.x*s.r,fy=s.y+f.y*s.r,d=Math.hypot(e.clientX-fx,e.clientY-fy)||1;if(d<95){f.x-=(e.clientX-fx)/d*.004;f.y-=(e.clientY-fy)/d*.004}})}});
canvas.addEventListener('pointerdown',e=>{ripples.push({x:e.clientX,y:e.clientY,r:5,a:.72});startAudio()});draw();
const defs=[['depth','海水深度'],['current','洋流強度'],['purity','海洋純淨度'],['jellies','水母數量'],['fish','魚群數量'],['large','大型生物'],['trash','海洋垃圾'],['life','生命力'],['pad','夢幻和弦'],['waves','海浪白噪音'],['bell','水晶鈴聲'],['whales','鯨魚歌聲'],['bubblesTrack','氣泡聲'],['currentTrack','洋流聲'],['deepBass','深海低頻'],['master','總音量']];
const controls=document.querySelector('#controls');
defs.forEach(([key,name],i)=>{const d=document.createElement('div');d.className='control';d.innerHTML='<label><span>'+name+'</span><output>'+Math.round(state[key]*127)+'</output></label><input type="range" min="0" max="127" value="'+Math.round(state[key]*127)+'" data-key="'+key+'"><small>'+(i<8?'SLIDER '+(i+1):'KNOB '+(i-7))+'</small>';controls.append(d)});
function setValue(key,val,ui=true){state[key]=Math.max(0,Math.min(1,val));mixAudio();if(ui){const e=document.querySelector('[data-key="'+key+'"]');if(e){e.value=Math.round(val*127);e.parentElement.querySelector('output').textContent=Math.round(val*127)}}updateHealth()}
function updateHealth(){const h=Math.round(100*(state.purity*.34+(1-state.trash)*.28+state.life*.26+(1-Math.abs(state.current-.4))*.12));document.querySelector('#healthNumber').textContent=h+'%';document.querySelector('#healthBar').style.width=h+'%';document.querySelector('#healthText').textContent=h>75?'穩定':h>45?'失衡':'危急'}
controls.addEventListener('input',e=>{if(e.target.matches('input'))setValue(e.target.dataset.key,+e.target.value/127)});
function toast(icon,msg){const el=document.querySelector('#toast');el.querySelector('span').textContent=icon;el.querySelector('p').textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function event(name){const act={whale:()=>{creatures.large[0].x=-.72;setValue('large',1);toast('🐋','鯨魚從透明球深處緩緩游過')},dolphin:()=>{creatures.large[1].x=-.72;setValue('large',1);toast('🐬','海豚快速穿越洋流')},jelly:()=>{setValue('jellies',1);toast('🪼','大量發光水母正在浮起')},turtle:()=>{creatures.large[2].x=-.72;setValue('large',1);toast('🐢','海龜回到乾淨的棲地')},pollution:()=>{setValue('trash',1);setValue('purity',.18);toast('🗑️','垃圾增加，海水開始混濁')},current:()=>{setValue('current',1);setValue('wave',1);toast('🌊','強烈洋流席捲整顆星球')},deep:()=>{state.deep=!state.deep;setValue('light',state.deep?.05:.7);toast('🌑',state.deep?'進入深海微光模式':'返回明亮海面')},clean:()=>{setValue('trash',0);setValue('purity',1);setValue('life',1);toast('✨','污染消退，海洋生命重新復甦')},play:()=>{state.playing=true;startAudio();mixAudio();toast('▶','星球與夢幻聲景開始呼吸')},stop:()=>{state.playing=false;mixAudio();toast('■','海洋與聲景慢慢靜止')},record:()=>{setValue('trash',1);setValue('purity',.05);setValue('life',.12);toast('●','人類污染入侵，生態進入危急狀態')}};if(act[name])act[name]()}
document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>event(b.dataset.event));
document.querySelector('#enterBtn').onclick=()=>document.querySelector('#panel').classList.add('open');
document.querySelector('#closePanel').onclick=()=>document.querySelector('#panel').classList.remove('open');
document.querySelector('#storyBtn').onclick=()=>document.querySelector('#concept').classList.add('open');
document.querySelector('#closeStory').onclick=()=>document.querySelector('#concept').classList.remove('open');
const midiBtn=document.querySelector('#midiBtn'),sliderCC=[0,1,2,3,4,5,6,7],knobCC=[16,17,18,19,20,21,22,23],keys=defs.map(x=>x[0]),buttonMap={32:'whale',33:'dolphin',34:'jelly',35:'turtle',48:'pollution',49:'current',50:'deep',51:'clean',41:'play',42:'stop',45:'record'};
midiBtn.onclick=async()=>{startAudio();if(!navigator.requestMIDIAccess){toast('⚠️','請使用支援 Web MIDI 的 Chrome 或 Edge');return}try{const access=await navigator.requestMIDIAccess();const bind=()=>{let n=0;access.inputs.forEach(input=>{input.onmidimessage=onMIDI;n++});midiBtn.classList.toggle('connected',n>0);midiBtn.querySelector('span').textContent=n?'nanoKONTROL2 已連接':'等待 MIDI 裝置';toast(n?'✅':'⚠️',n?'生命控制台已連接':'找不到 MIDI 輸入裝置')};bind();access.onstatechange=bind}catch(e){toast('⚠️','MIDI 權限未開啟')}};
function onMIDI(e){const [status,cc,value]=e.data;if((status&240)!==176)return;let idx=sliderCC.indexOf(cc);if(idx<0){const k=knobCC.indexOf(cc);if(k>=0)idx=k+8}if(idx>=0)setValue(keys[idx],value/127);if(value>0&&buttonMap[cc])event(buttonMap[cc])}
addEventListener('keydown',e=>{const map={q:'whale',w:'dolphin',e:'jelly',r:'turtle',a:'pollution',s:'current',d:'deep',f:'clean',' ':'play'};if(map[e.key.toLowerCase()])event(map[e.key.toLowerCase()])});updateHealth();