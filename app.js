const canvas=document.querySelector('#ocean');
const ctx=canvas.getContext('2d',{alpha:false});
const state={depth:.78,current:.35,purity:.78,jellies:.5,fish:.7,large:.75,trash:.18,life:.78,pad:.34,waves:.42,bell:.18,whales:.2,bubblesTrack:.16,currentTrack:.2,deepBass:.14,master:.55,wave:.3,speed:.45,chill:.7,light:.7,zoom:.55,playing:true,deep:false};
let W=0,H=0,DPR=1,t=0,last=performance.now(),mouseX=0,mouseY=0,toastTimer;
const ripples=[];let audio=null,audioPulse=0;
let ytPlayer=null,ytReady=false,ytWanted=false;
window.onYouTubeIframeAPIReady=()=>{ytPlayer=new YT.Player('youtubePlayer',{videoId:'rqF-W9QBHUQ',playerVars:{autoplay:0,controls:0,disablekb:1,loop:1,playlist:'rqF-W9QBHUQ',playsinline:1,rel:0},events:{onReady:e=>{ytReady=true;e.target.setVolume(Math.round(state.master*32));if(ytWanted&&state.playing)e.target.playVideo()},onError:e=>console.warn('YouTube background music unavailable',e.data)}})};
function startBackgroundMusic(){ytWanted=true;if(ytReady&&ytPlayer){ytPlayer.setVolume(Math.round(state.master*32));ytPlayer.playVideo()}}
function stopBackgroundMusic(){ytWanted=false;if(ytReady&&ytPlayer)ytPlayer.pauseVideo()}
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
  let chordIndex=0,nextChord=0,nextBell=0,nextBubble=0,nextWhale=0,nextDolphin=0,nextSwim=0,nextLifeTone=0,nextBass=0,lifeStep=0;
  const voice=(dest,freq,start,duration,type='sine',level=.08,detune=0)=>{
    const o=A.createOscillator(),g=A.createGain(),fl=A.createBiquadFilter();o.type=type;o.frequency.value=freq;o.detune.value=detune;fl.type='lowpass';fl.frequency.value=1350;fl.Q.value=.3;
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+Math.min(.9,duration*.25));g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(fl).connect(g).connect(dest);o.start(start);o.stop(start+duration+.1);return o
  };
  const timer=setInterval(()=>{const now=A.currentTime;
    if(now>=nextChord){const chord=chords[chordIndex%chords.length];chord.forEach((hz,i)=>{voice(pad,hz,now,8.5,i%2?'sine':'triangle',.068,i*3-4);voice(pad,hz/2,now,8.5,'sine',.028,5-i*2)});chordIndex++;nextChord=now+7.8}
    if(now>=nextBell){const chord=chords[(chordIndex-1+chords.length)%chords.length],hz=chord[Math.floor(Math.random()*chord.length)]*[2,3,4][Math.floor(Math.random()*3)];voice(bell,hz,now,2.4,'sine',.13);voice(bell,hz*2.01,now,1.3,'sine',.032);nextBell=now+rnd(.8,2.2)}
    if(now>=nextBubble){const pan=A.createStereoPanner(),g=A.createGain(),o=A.createOscillator();pan.pan.value=rnd(-.8,.8);o.type='sine';o.frequency.setValueAtTime(rnd(540,920),now);o.frequency.exponentialRampToValueAtTime(rnd(1250,1900),now+.11);g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(.1,now+.018);g.gain.exponentialRampToValueAtTime(.001,now+.17);o.connect(g).connect(pan).connect(bubble);o.start(now);o.stop(now+.2);nextBubble=now+rnd(.28,.95)}
    if(now>=nextWhale){const o=voice(whales,rnd(88,118),now,5.8,'sine',.19),v=A.createOscillator(),vg=A.createGain();v.frequency.value=rnd(.25,.5);vg.gain.value=7;v.connect(vg).connect(o.frequency);v.start(now);v.stop(now+5.9);nextWhale=now+rnd(9,16)}
    if(now>=nextDolphin){const chirps=Math.floor(rnd(2,4));for(let i=0;i<chirps;i++){const st=now+i*.13,o=A.createOscillator(),g=A.createGain(),pan=A.createStereoPanner();o.type='sine';o.frequency.setValueAtTime(rnd(1150,1650),st);o.frequency.exponentialRampToValueAtTime(rnd(2450,3400),st+.075);o.frequency.exponentialRampToValueAtTime(rnd(1500,2100),st+.16);g.gain.setValueAtTime(.001,st);g.gain.exponentialRampToValueAtTime(.075,st+.018);g.gain.exponentialRampToValueAtTime(.001,st+.19);pan.pan.value=rnd(-.65,.65);o.connect(g).connect(pan).connect(whales);o.start(st);o.stop(st+.21)}nextDolphin=now+rnd(5.5,10)}
    if(now>=nextSwim){const src=A.createBufferSource(),fl=A.createBiquadFilter(),g=A.createGain(),pan=A.createStereoPanner();src.buffer=noiseBuffer;fl.type='bandpass';fl.frequency.setValueAtTime(rnd(480,760),now);fl.frequency.exponentialRampToValueAtTime(rnd(1100,1700),now+.48);fl.Q.value=.7;pan.pan.value=rnd(-.75,.75);g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(.045,now+.12);g.gain.exponentialRampToValueAtTime(.001,now+.72);src.connect(fl).connect(g).connect(pan).connect(current);src.start(now,rnd(0,4));src.stop(now+.75);nextSwim=now+rnd(1.8,4.6)}
    if(now>=nextLifeTone){
      const density=Math.min(1,state.fish*.42+state.jellies*.33+state.large*.25),scale=[0,3,5,7,10],note=scale[lifeStep%scale.length],base=55*Math.pow(2,note/12),octave=state.jellies>.65?4:state.fish>.55?3:2,hz=base*octave;
      const destination=state.large>.72?whales:state.jellies>.48?bell:pad,duration=state.jellies>.55?2.8:1.7,level=.018+density*.047;
      voice(destination,hz,now,duration,'sine',level,rnd(-5,5));voice(destination,hz*1.5,now+.08,duration*.72,'sine',level*.24,rnd(-4,4));
      if(state.fish>.45&&lifeStep%2===0)voice(bell,hz*2,now+.22,.9,'triangle',level*.32);
      lifeStep++;nextLifeTone=now+Math.max(.42,2.3-density*1.55+state.chill*.45);
    }
    if(now>=nextBass){const root=chords[(chordIndex-1+chords.length)%chords.length][0]/2;voice(deep,root,now,7.5,'sine',.095);voice(deep,root*2,now,7.5,'triangle',.024);nextBass=now+7.8}
    const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);audioPulse=data.reduce((s,v)=>s+v,0)/(data.length*255);
  },90);
  audio={A,master,tracks,waveFilter:waveNoise.fl,currentFilter:currentNoise.fl,reverbWet:wet,analyser,timer};mixAudio();return audio;
}
function mixAudio(){if(audio){const now=audio.A.currentTime,active=state.playing?1:0,depth=Math.max(0,Math.min(1,state.depth)),life=Math.max(0,Math.min(1,state.life));audio.master.gain.setTargetAtTime(state.master*.82*active,now,.22);['pad','bell','whales','bubblesTrack','currentTrack'].forEach(k=>audio.tracks[k].gain.setTargetAtTime(Math.max(.001,state[k]),now,.25));audio.tracks.waves.gain.setTargetAtTime(Math.max(.2,state.waves)*(.82+.18*depth),now,.35);audio.tracks.deepBass.gain.setTargetAtTime(Math.max(.08,state.deepBass)*(1+depth*.55),now,.4);audio.waveFilter.frequency.setTargetAtTime(260+(1-depth)*720+state.waves*340,now,.45);audio.currentFilter.frequency.setTargetAtTime(390+(1-depth)*620+state.current*900,now,.4);audio.reverbWet.gain.setTargetAtTime(.34+depth*.26+life*.08,now,.6)}if(ytReady&&ytPlayer){ytPlayer.setVolume(Math.round(state.master*32));if(!state.playing)ytPlayer.pauseVideo()}}
async function startAudio(){createAudio();if(audio.A.state==='suspended')await audio.A.resume();state.playing=true;startBackgroundMusic();mixAudio()}
async function playSplash(strength=1){
  await startAudio();const A=audio.A,now=A.currentTime,duration=.55,buffer=A.createBuffer(1,Math.ceil(A.sampleRate*duration),A.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2.1);
  const src=A.createBufferSource(),filter=A.createBiquadFilter(),gain=A.createGain(),pan=A.createStereoPanner();src.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(1450,now);filter.frequency.exponentialRampToValueAtTime(430,now+duration);filter.Q.value=.62;pan.pan.value=Math.max(-.8,Math.min(.8,pointerNX||0));gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.16*strength,now+.018);gain.gain.exponentialRampToValueAtTime(.001,now+duration);src.connect(filter).connect(gain).connect(pan).connect(audio.tracks.waves);src.start(now);src.stop(now+duration);
  const plop=A.createOscillator(),pg=A.createGain();plop.type='sine';plop.frequency.setValueAtTime(190,now);plop.frequency.exponentialRampToValueAtTime(72,now+.28);pg.gain.setValueAtTime(.001,now);pg.gain.exponentialRampToValueAtTime(.11*strength,now+.018);pg.gain.exponentialRampToValueAtTime(.001,now+.32);plop.connect(pg).connect(pan);plop.start(now);plop.stop(now+.34);
}
function seed(){
  creatures.fish=Array.from({length:72},(_,i)=>({x:rnd(-.82,.82),y:rnd(-.65,.65),z:rnd(.2,1),s:rnd(.12,.3),phase:rnd(0,9),color:['#7ff6ff','#ffc978','#ef8dcc','#a8ffcf','#a6b7ff','#ffffff'][i%6]}));
  creatures.jelly=Array.from({length:28},()=>({x:rnd(-.8,.8),y:rnd(-.7,.65),z:rnd(.25,1),s:rnd(.5,1.15),phase:rnd(0,9)}));
  creatures.trash=Array.from({length:36},(_,i)=>({x:rnd(-.78,.78),y:rnd(-.65,.68),z:rnd(.3,1),phase:rnd(0,9),kind:i%3}));
  creatures.bubbles=Array.from({length:90},()=>({x:rnd(-.92,.92),y:rnd(-.9,.9),r:rnd(1,4),s:rnd(.03,.12),phase:rnd(0,9)}));
  creatures.large=[
    {type:'whale',x:-.35,y:.16,z:.9,s:.055,phase:1},
    {type:'dolphin',x:.35,y:-.18,z:.7,s:.11,phase:3},
    {type:'turtle',x:.12,y:.43,z:.62,s:.065,phase:5},
    {type:'manta',x:-.58,y:-.38,z:.72,s:.045,phase:7},
    {type:'manta',x:.48,y:.34,z:.46,s:.035,phase:9}
  ];
}seed();
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const sphere=()=>{const mobile=W<760;const r=Math.min(W,H)*(mobile?.35:.39)*(0.78+state.zoom*.28);return{x:mobile?W*.68:W*.71,y:mobile?H*.38:H*.47,r}};
const OCEAN_COLORS=Object.freeze({
  water:'124,203,235',
  jelly:'196,161,255',
  fish:'242,206,118',
  whale:'114,158,255',
  dolphin:'101,221,208',
  turtle:'161,213,139',
  trash:'239,148,126',
  glass:'205,252,255'
});
let drawColor=OCEAN_COLORS.water,drawDepth=0,drawGlow=1;
const visual={};Object.assign(visual,state);
let yaw=.32,pitch=.38,slosh=0,sloshV=0,ripple=0,drag=null,pointerNX=0,pointerNY=0,pointerActive=0,impact=0;
const innerR=.968,TAU=Math.PI*2;
function glassSphere(){const mobile=W<760,r=Math.min(W,H)*(mobile?.355:.405)*(0.82+state.zoom*.2);return{x:mobile?W*.66:W*.715,y:mobile?H*.39:H*.47,r}}
function palette(){const clean=visual.purity;return{line:OCEAN_COLORS.water,fg:OCEAN_COLORS.glass,bg:clean>.45?'3,19,27':'25,27,25'}}
function project(x,y,z,s){const X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=-x*Math.sin(yaw)+z*Math.cos(yaw);return{x:s.x+X*s.r,y:s.y+(Z*Math.sin(pitch)-y*Math.cos(pitch))*s.r,z:Z*Math.cos(pitch)+y*Math.sin(pitch)}}
function edgeHeight(ang){const amp=visual.wave,crest=Math.pow((1+Math.cos(ang-t*.66))*.5,8);return Math.max(-.7,Math.min(.5,-.15+amp*(.2*Math.sin(ang+t*.86)+.11*Math.sin(2*ang-t*1.17)+.065*Math.sin(3*ang+t*.57)+.24*(crest-.196))+slosh*Math.cos(ang-yaw)+ripple*.1*Math.sin(3*ang-t*3.7)))}
function surfacePoint(u,v){const rr0=Math.min(1,Math.hypot(u,v)),ang=Math.atan2(v,u),edge=edgeHeight(ang),swirl=visual.current*.32*(1-rr0*rr0)*Math.sin(t*.24),aa0=ang+swirl,x0=Math.cos(aa0)*rr0,z0=Math.sin(aa0)*rr0,w=(Math.sin(x0*5.1+t*1.32)*.105+Math.cos(z0*6.2-t*.92)*.06+Math.sin((x0-z0)*9+t*.74)*.026)*visual.wave;let y=-.15+(edge+.15)*rr0*rr0+w*(1-rr0)+ripple*.14*Math.sin(rr0*17-t*5)*(1-rr0),rr=rr0*Math.sqrt(Math.max(0,innerR*innerR-edge*edge));y=Math.max(-.76,Math.min(.56,y));const warp=.032*Math.sin(ang*3+t*.7+rr0*7)*(1-rr0)*rr0*visual.current,aa=ang+warp,limit=Math.sqrt(Math.max(0,innerR*innerR-y*y));rr=Math.min(rr,limit);return{x:rr*Math.cos(aa),y,z:rr*Math.sin(aa)}}
function volumePoint(f,ang){const top=Math.acos(-edgeHeight(ang)/innerR),bend=.048*Math.sin(3*ang-t*1.2+f*5)*Math.sin(Math.PI*f)*visual.wave,theta=top*f+bend,rr=innerR*Math.sin(theta);return{x:rr*Math.cos(ang),y:-innerR*Math.cos(theta),z:rr*Math.sin(ang)}}
const forms={
 whale:new Path2D('M .97 -.08 C .94 -.30 .56 -.38 .23 -.32 C -.06 -.31 -.43 -.13 -.69 -.05 L -.87 -.23 Q -.98 -.31 -1.10 -.22 L -.90 .02 L -1.08 .22 Q -.91 .28 -.70 .09 C -.37 .23 .01 .37 .43 .30 C .72 .25 .98 .09 .97 -.08 Z'),
 dolphin:new Path2D('M 1 -.04 L .72 -.15 C .55 -.35 .25 -.29 .09 -.23 Q -.06 -.55 -.25 -.48 L -.23 -.18 C -.42 -.10 -.59 -.01 -.73 .02 L -.95 -.17 L -1.04 -.10 L -.87 .10 L -1.02 .27 Q -.83 .28 -.67 .14 C -.40 .22 -.14 .20 .20 .15 L .09 .39 Q .29 .35 .41 .13 C .60 .10 .71 .03 1 .03 Z'),
 fish:new Path2D('M 1 0 Q .20 -.57 -.58 -.12 L -1 -.43 L -1 .43 L -.58 .12 Q .20 .57 1 0 Z'),
 bottle:new Path2D('M -.15 -.70 L .15 -.70 L .15 -.45 Q .34 -.34 .34 -.15 L .34 .60 Q 0 .73 -.34 .60 L -.34 -.15 Q -.34 -.34 -.15 -.45 Z'),
 bag:new Path2D('M -.48 -.38 L -.43 -.76 L -.19 -.76 L -.14 -.39 Q .02 -.32 .18 -.40 L .24 -.76 L .46 -.71 L .42 -.31 Q .65 .10 .44 .61 Q .05 .75 -.48 .53 Q -.62 .04 -.48 -.38 Z')
};
function lineColor(alpha=1){const depthFade=.68+.32*Math.max(0,Math.min(1,(drawDepth+1)/2)),a=Math.min(1,alpha*depthFade*drawGlow);return'rgba('+drawColor+','+a+')'}
function ink(path,alpha=.85,fill=true){if(fill){ctx.fillStyle='rgba('+drawColor+','+(alpha*.105*drawGlow)+')';ctx.fill(path)}ctx.shadowColor='rgba('+drawColor+','+(.38*drawGlow)+')';ctx.shadowBlur=6*drawGlow;ctx.strokeStyle=lineColor(alpha);ctx.stroke(path);ctx.shadowBlur=0}
function stroke(path,alpha=.6){ctx.strokeStyle=lineColor(alpha);ctx.stroke(new Path2D(path))}
function eye(x,y,r=.018){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='rgba('+drawColor+','+(.82*drawGlow)+')';ctx.fill()}
function whaleShape(ph){ctx.rotate(Math.sin(ph)*.035);ink(forms.whale);stroke('M -.28 .10 Q -.01 .18 .02 .51 Q .23 .47 .31 .24',.75);for(let j=0;j<5;j++)stroke('M -.49 '+(.02+j*.03)+' Q .25 '+(.1+j*.03)+' .85 '+(.01+j*.02),.25+j*.05);stroke('M -.20 -.24 Q -.12 -.43 .04 -.32',.6);eye(.73,-.04);ctx.save();ctx.translate(-.82,0);ctx.rotate(Math.sin(ph)*.16);stroke('M -.22 -.17 Q -.04 -.04 .04 0 Q -.04 .06 -.22 .19',.72);ctx.restore()}
function dolphinShape(ph){ctx.rotate(Math.sin(ph)*.06);ink(forms.dolphin,.9);stroke('M -.66 .06 Q .06 -.02 .70 -.09',.4);stroke('M -.15 .14 Q -.10 .30 .11 .39',.7);eye(.58,-.11)}
function turtleShape(ph){const flap=Math.sin(ph)*.2;for(const side of[-1,1]){ctx.save();ctx.scale(1,side);ctx.rotate(flap*side*.28);ink(new Path2D('M .24 -.34 Q .29 -.76 -.18 -.99 Q -.40 -.76 -.13 -.37 Z'),.65);ink(new Path2D('M -.45 -.28 Q -.84 -.63 -.83 -.26 L -.55 -.08 Z'),.55);ctx.restore()}ink(new Path2D('M .45 -.15 Q .99 -.23 .98 .01 Q .94 .24 .46 .15 Z'),.85);ctx.beginPath();ctx.ellipse(-.05,0,.64,.43,0,0,TAU);ctx.fillStyle='rgba('+palette().bg+',.85)';ctx.fill();ctx.strokeStyle=lineColor(.9);ctx.stroke();stroke('M -.40 -.16 L -.12 -.28 L .19 -.18 L .26 .07 L -.01 .26 L -.31 .14 Z M -.12 -.28 L -.11 -.42 M .19 -.18 L .48 -.25 M .26 .07 L .57 .13 M -.01 .26 L -.03 .42 M -.31 .14 L -.53 .28',.65);eye(.81,-.06,.025)}
function jellyShape(ph){const pulse=.9+.1*Math.sin(ph*1.8);ctx.save();ctx.scale(pulse,1.08-.1*Math.sin(ph*1.8));ink(new Path2D('M -.68 0 C -.67 -.91 .65 -.91 .68 0 Q .34 .17 0 .04 Q -.31 .18 -.68 0 Z'),.82);stroke('M -.65 -.02 Q 0 -.23 .65 -.02',.65);ctx.restore();for(let j=0;j<7;j++){const x=(j-3)*.16;ctx.beginPath();for(let k=0;k<=26;k++){const f=k/26,y=f*(.9+.15*Math.sin(j*2)),xx=x+Math.sin(f*7-ph*1.7+j)*.1*f;k?ctx.lineTo(xx,y):ctx.moveTo(xx,y)}ctx.strokeStyle=lineColor(.27+.06*(j%3));ctx.stroke()}}
function trashShape(type,ph){ctx.rotate(Math.sin(ph*.38)*.33);ink(forms[type],.62);if(type==='bottle')stroke('M -.33 -.05 L .33 -.05 M -.33 .35 L .33 .35 M -.14 -.58 L .14 -.58',.42);else stroke('M -.35 -.18 Q -.11 .18 -.30 .52 M .25 -.14 Q -.03 .19 .28 .54',.38)}
function residents(s){const o=[],add=(kind,x,y,z,size,ph,ang=0,type='')=>{const follow={fish:.15,dolphin:.105,turtle:.06,jelly:.048,whale:.035,trash:0}[kind]||0,depthFollow=.62+.38*Math.max(0,Math.min(1,(z+1)/2));x+=pointerNX*follow*pointerActive*depthFollow;y-=pointerNY*follow*pointerActive*depthFollow;if(kind!=='trash'){const wobble=impact*(kind==='fish'?.07:kind==='jelly'?.055:.035);x+=Math.sin(t*7.5+ph*1.7)*wobble;y+=Math.cos(t*6.2+ph*1.3)*wobble*.7;ang+=Math.sin(t*8+ph)*impact*.12}const margin=size*1.2,d=Math.hypot(x,y,z),lim=innerR-margin;if(d>lim){const q=lim/d;x*=q;y*=q;z*=q}o.push({kind,p:project(x,y,z,s),size,ph,ang,type})};
 const large=visual.large;
 if(large>.12)add('whale',-.12+.1*Math.sin(t*.24),-.53+.025*Math.sin(t*.65),.13,.27,t*1.4,-.09);
 if(large>.35)add('dolphin',.38+.07*Math.sin(t*.52),-.39+.04*Math.sin(t*.95),-.08,.16,t*2.5,-.15);
 if(large>.58)add('turtle',.24+.06*Math.sin(t*.3),-.7+.02*Math.sin(t*.8),.08,.115,t*1.6,.25);
 const jc=Math.max(0,Math.round(visual.jellies*5));for(let i=0;i<jc;i++)add('jelly',-.58+i*.21+.025*Math.sin(t*.35+i),-.4+.05*(i%2)+.03*Math.sin(t*1.2+i),.08-.12*i,.07+(i%2)*.025,t+i,i*.06);
 const fc=Math.round(visual.fish*30);for(let i=0;i<fc;i++){const row=Math.floor(i/7),col=i%7,ph=t*4+i*.72;add('fish',-.42+col*.1-row*.025+.018*Math.sin(i*2.7)+.07*Math.sin(t*.55+row),-.69+row*.065+.014*Math.cos(i*1.7),.18-row*.05,.021+(i%3)*.004,ph,.08*Math.sin(t+col))}
 const tc=Math.round(visual.trash*8);for(let i=0;i<tc;i++)add('trash',.5-.15*(i%3)+.025*Math.sin(t*.3+i),-.46-.09*Math.floor(i/3)+.025*Math.sin(t*.7+i),.12-.08*i,.052,t+i,i*.25,i%2?'bag':'bottle');
 o.sort((a,b)=>a.p.z-b.p.z);for(const x of o){drawColor=OCEAN_COLORS[x.kind]||OCEAN_COLORS.fish;drawDepth=x.p.z;drawGlow=x.kind==='trash'?.62:1.14;ctx.save();ctx.translate(x.p.x,x.p.y);ctx.rotate(x.ang);const sc=x.size*s.r;ctx.scale(sc,sc);ctx.lineWidth=Math.max(.009,.85/sc);ctx.lineJoin='round';ctx.lineCap='round';if(x.kind==='whale')whaleShape(x.ph);else if(x.kind==='dolphin')dolphinShape(x.ph);else if(x.kind==='turtle')turtleShape(x.ph);else if(x.kind==='jelly')jellyShape(x.ph);else if(x.kind==='trash')trashShape(x.type,x.ph);else{ctx.rotate(Math.sin(x.ph)*.07);ink(forms.fish,.72);eye(.45,-.015,.04)}ctx.restore()}drawColor=OCEAN_COLORS.water;drawDepth=0;drawGlow=.58}
const seeds=Array.from({length:90},(_,i)=>({a:i*2.399963,r:Math.sqrt((i+.5)/90)*.88,p:i*1.719}));
function bg(){const g=ctx.createRadialGradient(W*.7,H*.45,10,W*.7,H*.45,Math.max(W,H)*.8);g.addColorStop(0,visual.purity>.45?'#062d38':'#262a27');g.addColorStop(.55,'#03151d');g.addColorStop(1,'#01080d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function draw(){requestAnimationFrame(draw);drawColor=OCEAN_COLORS.water;drawDepth=0;drawGlow=.58;const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now;if(state.playing)t+=dt*(.22+state.speed*1.5);for(const k of['depth','current','purity','jellies','fish','large','trash','life','wave','light','zoom'])visual[k]+=(state[k]-visual[k])*(1-Math.exp(-dt*7));ripple*=Math.exp(-dt*.9);impact*=Math.exp(-dt*2.05);pointerActive+=(1-pointerActive)*(1-Math.exp(-dt*3));sloshV+=(-slosh*7-sloshV*2)*dt;slosh+=sloshV*dt;bg();const s=glassSphere();ctx.save();ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.clip();
 const p=palette(),halo=ctx.createRadialGradient(s.x-s.r*.18,s.y+s.r*.3,0,s.x,s.y,s.r);halo.addColorStop(0,'rgba('+p.line+',.09)');halo.addColorStop(1,'rgba('+p.bg+',.85)');ctx.fillStyle=halo;ctx.fillRect(s.x-s.r,s.y-s.r,s.r*2,s.r*2);
 const contours=front=>{for(let j=0;j<25;j++){const f=.06+j*.93/24;ctx.beginPath();let pen=false;for(let i=0;i<=120;i++){const ang=i*TAU/120,q=project(...Object.values(volumePoint(f,ang)),s),near=Math.sin(ang-yaw)>0;if(near!==front){pen=false;continue}pen?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);pen=true}ctx.strokeStyle=lineColor(front?.08+.18*f:.04);ctx.lineWidth=front?.7:.45;ctx.stroke()}};
 contours(false);
 for(let j=0;j<20;j++){ctx.beginPath();for(let i=0;i<=64;i++){const ang=yaw+Math.PI*i/64,q=project(...Object.values(volumePoint(j/20,ang)),s);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}for(let i=64;i>=0;i--){const ang=yaw+Math.PI*i/64,q=project(...Object.values(volumePoint((j+1)/20,ang)),s);ctx.lineTo(q.x,q.y)}ctx.closePath();ctx.fillStyle=lineColor(.028);ctx.fill()}
 const rows=[];for(let j=0;j<39;j++){const v=-.998+j*1.996/38,ext=Math.sqrt(Math.max(0,1-v*v)),pts=[];let dep=0;for(let i=0;i<=92;i++){const u=-ext+ext*2*i/92,sp=surfacePoint(u,v),q=project(sp.x,sp.y,sp.z,s);pts.push(q);dep+=q.z}rows.push({pts,dep:dep/93})}rows.sort((x,y)=>x.dep-y.dep);for(const row of rows){ctx.beginPath();row.pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.strokeStyle=lineColor(.12+(row.dep+1)*.17);ctx.lineWidth=.5+(row.dep+1)*.18;ctx.stroke()}
 contours(true);
 for(let j=0;j<84;j++){const aa=j*TAU/84,bb=(j+1)*TAU/84,gl=Math.pow((1+Math.sin(aa*3-t*1.3))*.5,5),sp=surfacePoint(Math.cos(aa),Math.sin(aa)),sq=surfacePoint(Math.cos(bb),Math.sin(bb)),q=project(sp.x,sp.y,sp.z,s),r=project(sq.x,sq.y,sq.z,s);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.strokeStyle=lineColor(.04+gl*.34);ctx.lineWidth=.55+gl*.55;ctx.stroke()}
 const count=Math.round(visual.life*70);for(let i=0;i<count;i++){const z=seeds[i],ang=z.a+t*(.12+visual.current*.18),rr=Math.min(.94,z.r+.03*Math.sin(t*.8+z.p)),water=surfacePoint(Math.cos(ang)*rr,Math.sin(ang)*rr),bottom=-Math.sqrt(Math.max(0,innerR*innerR-water.x*water.x-water.z*water.z)),y=bottom+(water.y-bottom)*(.25+.55*(.5+.5*Math.sin(z.p+t*.5))),q=project(water.x,y,water.z,s),sz=.7+(q.z+1)*.4;ctx.fillStyle='rgba('+p.fg+','+(.16+.18*(.5+.5*Math.sin(z.p+t)))+')';ctx.beginPath();ctx.arc(q.x,q.y,sz,0,TAU);ctx.fill()}
 residents(s);ctx.restore();
 ctx.strokeStyle='rgba('+p.fg+',.14)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.stroke();ctx.globalAlpha=.38;ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(s.x,s.y,s.r-1,3.62,4.82);ctx.stroke();ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(s.x,s.y,s.r-2,.05,1.04);ctx.stroke();ctx.globalAlpha=1;
 ctx.save();ctx.translate(s.x,s.y);ctx.rotate(-.38);ctx.strokeStyle='rgba('+p.fg+',.09)';ctx.lineWidth=s.r*.028;ctx.beginPath();ctx.ellipse(-s.r*.61,-s.r*.22,s.r*.1,s.r*.31,0,Math.PI*.8,Math.PI*1.85);ctx.stroke();ctx.restore()}
canvas.style.touchAction='none';
function updatePointer(e){const s=glassSphere();mouseX=e.clientX;mouseY=e.clientY;pointerNX=Math.max(-.82,Math.min(.82,(e.clientX-s.x)/s.r));pointerNY=Math.max(-.82,Math.min(.82,(e.clientY-s.y)/s.r));pointerActive=1}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);updatePointer(e);drag={x:e.clientX,y:e.clientY,m:0};startAudio().catch(console.error)});
canvas.addEventListener('pointermove',e=>{updatePointer(e);if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);yaw+=dx*.007;pitch=Math.max(.15,Math.min(.9,pitch+dy*.004));sloshV=Math.max(-1.5,Math.min(1.5,sloshV+dx*.006));drag.x=e.clientX;drag.y=e.clientY});
canvas.addEventListener('pointerup',e=>{updatePointer(e);if(drag&&drag.m<6){ripple=1;impact=1;sloshV=Math.max(-1.5,Math.min(1.5,sloshV+(pointerNX||.22)*.72));playSplash(.95).catch(console.error)}drag=null});
canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('pointerleave',()=>{if(!drag)pointerActive=.35});
draw();
const defs=[['depth','海水深度'],['current','洋流強度'],['purity','海洋純淨度'],['jellies','水母數量'],['fish','魚群數量'],['large','大型生物'],['trash','海洋垃圾'],['life','生命力'],['pad','夢幻和弦'],['waves','海浪白噪音'],['bell','水晶鈴聲'],['whales','鯨魚歌聲'],['bubblesTrack','氣泡聲'],['currentTrack','洋流聲'],['deepBass','深海低頻'],['master','總音量']];
const controls=document.querySelector('#controls');
defs.forEach(([key,name],i)=>{const d=document.createElement('div');d.className='control';d.innerHTML='<label><span>'+name+'</span><output>'+Math.round(state[key]*127)+'</output></label><input type="range" min="0" max="127" value="'+Math.round(state[key]*127)+'" data-key="'+key+'"><small>'+(i<8?'SLIDER '+(i+1):'KNOB '+(i-7))+'</small>';controls.append(d)});
function setValue(key,val,ui=true){state[key]=Math.max(0,Math.min(1,val));mixAudio();if(ui){const e=document.querySelector('[data-key="'+key+'"]');if(e){e.value=Math.round(val*127);e.parentElement.querySelector('output').textContent=Math.round(val*127)}}updateHealth()}
function updateHealth(){const h=Math.round(100*(state.purity*.34+(1-state.trash)*.28+state.life*.26+(1-Math.abs(state.current-.4))*.12));document.querySelector('#healthNumber').textContent=h+'%';document.querySelector('#healthBar').style.width=h+'%';document.querySelector('#healthText').textContent=h>75?'穩定':h>45?'失衡':'危急'}
controls.addEventListener('input',e=>{if(e.target.matches('input'))setValue(e.target.dataset.key,+e.target.value/127)});
function toast(icon,msg){const el=document.querySelector('#toast');el.querySelector('span').textContent=icon;el.querySelector('p').textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function event(name){const act={whale:()=>{creatures.large[0].x=-.72;setValue('large',1);toast('🐋','鯨魚從透明球深處緩緩游過')},dolphin:()=>{creatures.large[1].x=-.72;setValue('large',1);toast('🐬','海豚快速穿越洋流')},jelly:()=>{setValue('jellies',1);toast('🪼','大量發光水母正在浮起')},turtle:()=>{creatures.large[2].x=-.72;setValue('large',1);toast('🐢','海龜回到乾淨的棲地')},pollution:()=>{setValue('trash',1);setValue('purity',.18);toast('🗑️','垃圾增加，海水開始混濁')},current:()=>{setValue('current',1);setValue('wave',1);toast('🌊','強烈洋流席捲整顆星球')},deep:()=>{state.deep=!state.deep;setValue('light',state.deep?.05:.7);toast('🌑',state.deep?'進入深海微光模式':'返回明亮海面')},clean:()=>{setValue('trash',0);setValue('purity',1);setValue('life',1);toast('✨','污染消退，海洋生命重新復甦')},play:()=>{state.playing=true;startAudio();mixAudio();if(soundBtn){soundBtn.classList.add('active');soundBtn.querySelector('span').textContent='聲景播放中'}toast('▶','星球與夢幻聲景開始呼吸')},stop:()=>{state.playing=false;stopBackgroundMusic();mixAudio();if(soundBtn){soundBtn.classList.remove('active');soundBtn.querySelector('span').textContent='啟動夢幻聲景'}toast('■','海洋與聲景慢慢靜止')},record:()=>{setValue('trash',1);setValue('purity',.05);setValue('life',.12);toast('●','人類污染入侵，生態進入危急狀態')}};if(act[name])act[name]()}
document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>event(b.dataset.event));
const soundBtn=document.querySelector('#soundBtn');
soundBtn.onclick=async()=>{try{await startAudio();state.playing=true;mixAudio();soundBtn.classList.add('active');soundBtn.querySelector('span').textContent='聲景播放中';toast('♫','夢幻海洋聲景已啟動')}catch(e){console.error(e);toast('⚠️','聲音啟動失敗，請確認瀏覽器音量與分頁靜音設定')}};
document.querySelector('#enterBtn').onclick=()=>{document.querySelector('#panel').classList.add('open');startAudio().catch(console.error)};
document.querySelector('#closePanel').onclick=()=>document.querySelector('#panel').classList.remove('open');
document.querySelector('#storyBtn').onclick=()=>document.querySelector('#concept').classList.add('open');
document.querySelector('#closeStory').onclick=()=>document.querySelector('#concept').classList.remove('open');
const midiBtn=document.querySelector('#midiBtn'),sliderCC=[0,1,2,3,4,5,6,7],knobCC=[16,17,18,19,20,21,22,23],keys=defs.map(x=>x[0]),buttonMap={32:'whale',33:'dolphin',34:'jelly',35:'turtle',48:'pollution',49:'current',50:'deep',51:'clean',41:'play',42:'stop',45:'record'};
midiBtn.onclick=async()=>{startAudio();if(!navigator.requestMIDIAccess){toast('⚠️','請使用支援 Web MIDI 的 Chrome 或 Edge');return}try{const access=await navigator.requestMIDIAccess();const bind=()=>{let n=0;access.inputs.forEach(input=>{input.onmidimessage=onMIDI;n++});midiBtn.classList.toggle('connected',n>0);midiBtn.querySelector('span').textContent=n?'nanoKONTROL2 已連接':'等待 MIDI 裝置';toast(n?'✅':'⚠️',n?'生命控制台已連接':'找不到 MIDI 輸入裝置')};bind();access.onstatechange=bind}catch(e){toast('⚠️','MIDI 權限未開啟')}};
function onMIDI(e){const [status,cc,value]=e.data;if((status&240)!==176)return;let idx=sliderCC.indexOf(cc);if(idx<0){const k=knobCC.indexOf(cc);if(k>=0)idx=k+8}if(idx>=0)setValue(keys[idx],value/127);if(value>0&&buttonMap[cc])event(buttonMap[cc])}
addEventListener('keydown',e=>{const map={q:'whale',w:'dolphin',e:'jelly',r:'turtle',a:'pollution',s:'current',d:'deep',f:'clean',' ':'play'};if(map[e.key.toLowerCase()])event(map[e.key.toLowerCase()])});updateHealth();