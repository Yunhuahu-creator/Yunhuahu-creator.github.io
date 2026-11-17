/* Typography adapted from Codrops DoNotScroll: four staggered glyph layers,
 * shared scale origin and source movement/scale curves; no grid or letter throws.
MIT License

Copyright (c) 2026 Antoine Wodniack

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
/* Local handoff: Seam 09 branching roots and independent video expansion.
 * The Blender timeline, camera and lighting remain owned by material-study.js. */
window.createFieldRecording=function({resume}){
 const el=document.getElementById('field-recording'),intro=el.querySelector('.record-intro'),question=el.querySelector('.record-question');
 const seamEl=el.querySelector('.record-seam'),paper=el.querySelector('.record-paper');
 const media=el.querySelector('.record-media'),video=el.querySelector('video'),filmStage=el.querySelector('.record-video-stage');
 const still=document.createElement('canvas');still.id='field-still';still.setAttribute('aria-hidden','true');document.getElementById('scene').after(still);const stillContext=still.getContext('2d');
 const placeholder=el.querySelector('.record-placeholder'),subtitle=el.querySelector('.record-subtitle');
 const $=id=>document.getElementById(id),defaults={count:75,length:.8,width:1.5,bend:.7,distance:4.8,soilDepth:1,soilScale:1.1,soilRoughness:.45};
 const storage='earthAgain.fieldRecording.strands.v3',clip=x=>Math.max(0,Math.min(1,x));
 const smooth=(a,b,x)=>{const t=clip((x-a)/(b-a));return t*t*(3-2*t);};
 const state={active:false,y:0,objectURL:null,sound:false,videoVisible:false,pageDistance:0,last:-1,dirty:true,edge:null,background:null,capture:false,frozen:false,rootScroll:0};
 let textMotion,textStates=[],roots,changed=()=>{},split=()=>{},pinY=0;
 // IENBA, Plant Growing (CC0), Freesound 648958: public high-quality MP3 preview.
 const rootAudio=$('root-growth-audio'),rootVolume=$('root-volume'),rootVolumeOutput=$('root-volume-value');
 let rootPlayPending=false,rootSoundTarget=0,rootMovementHold=0,rootLevel=.5;
 try{const saved=window.__presentationSettings?.rootVolume??localStorage.getItem('earthAgain.rootSoundVolume');if(saved!==null&&Number.isFinite(Number(saved)))rootLevel=clip(Number(saved));}catch{}
 rootVolume.value=Math.round(rootLevel*100);rootVolumeOutput.textContent=rootVolume.value+'%';
 rootVolume.addEventListener('input',()=>{rootLevel=Number(rootVolume.value)/100;rootVolumeOutput.textContent=rootVolume.value+'%';try{localStorage.setItem('earthAgain.rootSoundVolume',String(rootLevel));}catch{}});
 function silenceRoots(){rootSoundTarget=0;rootMovementHold=0;rootAudio.volume=0;rootAudio.pause();rootAudio.currentTime=0;}
 function updateRootAudio(speed,envelope,dt){
  if(speed>.5)rootMovementHold=.16;else rootMovementHold=Math.max(0,rootMovementHold-dt);
  rootSoundTarget=state.sound&&state.active&&envelope>0&&rootMovementHold>0&&!document.hidden&&document.hasFocus()?Math.min(1,rootLevel*1.4)*envelope:0;
  rootAudio.volume+=(rootSoundTarget-rootAudio.volume)*(1-Math.exp(-dt*(rootSoundTarget>rootAudio.volume?6:4)));
  rootAudio.dataset.targetVolume=rootSoundTarget.toFixed(3);
  if(rootSoundTarget>.002&&rootAudio.paused&&!rootPlayPending){rootPlayPending=true;rootAudio.play().catch(error=>{rootAudio.dataset.error=error.message;}).finally(()=>{rootPlayPending=false;if(!state.sound||!state.active||document.hidden||!document.hasFocus())silenceRoots();});}
  if(rootSoundTarget===0&&rootAudio.volume<.002){rootAudio.volume=0;rootAudio.pause();if(rootAudio.currentTime!==0)rootAudio.currentTime=0;}
 }
 rootAudio.volume=0;addEventListener('blur',silenceRoots);addEventListener('pagehide',silenceRoots);document.addEventListener('visibilitychange',()=>{if(document.hidden)silenceRoots();});
 function values(){return Object.fromEntries(Object.keys(defaults).map(k=>[k,Number($('strand-'+k).value)]));}
 try{const current=window.__presentationSettings?'pinned':localStorage.getItem(storage),saved=window.__presentationSettings?.roots||JSON.parse(current||localStorage.getItem('earthAgain.fieldRecording.strands.v2')||'null');if(saved&&!current&&!window.__presentationSettings)saved.distance=defaults.distance;for(const k of Object.keys(defaults))if(saved?.[k]!=null)$('strand-'+k).value=saved[k];}catch(e){}
 for(const line of question.querySelectorAll('.record-line')){
  const text=line.textContent;line.textContent='';
  for(const c of text){const span=document.createElement('span');span.className='next__char';span.textContent=c===' '? '\u00a0':c;line.append(span);if(c!==' ')for(let k=0;k<4;k++){const ghost=document.createElement('span');ghost.className='record-ghost';ghost.setAttribute('data-char',c);ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--layer',k);span.append(ghost);}}
 }
 // DoNotScroll final-step mechanism: each downward input emits a random glyph,
 // while its source regrows; live ballistic flights and delayed trails are independent.
 const endingLetters=[],endingFlights=new Set(),endingTitle=el.querySelector('.ending-title'),endingPage=el.querySelector('.record-after');
 const endingFlightLayer=document.createElement('div');endingFlightLayer.className='ending-flights';endingFlightLayer.setAttribute('aria-hidden','true');endingPage.append(endingFlightLayer);
 let lastThrowTime=-Infinity,endingThrowCount=0;
 for(const word of el.querySelectorAll('.ending-word')){
  const text=word.textContent;word.textContent='';
  for(const c of text){const letter=document.createElement('span');letter.className='ending-letter';letter.textContent=c;letter.setAttribute('aria-hidden','true');const ghosts=[];
   for(let layer=0;layer<4;layer++){const ghost=document.createElement('span');ghost.className='ending-ghost';ghost.dataset.char=c;letter.append(ghost);ghosts.push(ghost);}
   endingLetters.push({el:letter,ghosts,recoveryScale:1,recovery:null});word.append(letter);
  }
 }
 function clearEnding(){
  for(const flight of endingFlights){flight.timeline.kill();flight.el.remove();}endingFlights.clear();
  for(const letter of endingLetters){letter.recovery?.kill();letter.recovery=null;letter.recoveryScale=1;for(const ghost of letter.ghosts)ghost.style.transform='none';}
  lastThrowTime=-Infinity;
 }
 function throwEnding(delta,event){
  if(!state.active||delta<=0||event.ctrlKey||event.target.closest('aside,input,textarea,select,button,a,[role="button"]'))return;
  if(state.y-distance()-innerHeight*.2<innerHeight*.95)return;
  const now=performance.now();if(now-lastThrowTime<50)return;lastThrowTime=now;
  const letter=endingLetters[gsap.utils.random(0,endingLetters.length-1,1)],box=letter.el.getBoundingClientRect(),page=endingPage.getBoundingClientRect(),clone=letter.el.cloneNode(true),style=getComputedStyle(letter.el),scale=Math.max(.2,letter.recoveryScale);
  clone.classList.add('ending-flight');clone.style.cssText='left:'+(box.left-page.left)+'px;top:'+(box.top-page.top)+'px;width:'+box.width+'px;height:'+box.height+'px;font:'+style.font+';letter-spacing:'+style.letterSpacing+';';endingFlightLayer.append(clone);
  const ghosts=[...clone.querySelectorAll('.ending-ghost')],velocity=gsap.utils.random(.75,1.125)*innerHeight,angle=gsap.utils.random(-120,-60)*Math.PI/180,gravity=innerHeight*1.6,vy=Math.sin(angle)*velocity,rotation=gsap.utils.random(-100,100);
  const fallDistance=innerHeight+box.height-(box.top-page.top)-40,duration=(-vy+Math.sqrt(vy*vy+2*gravity*Math.max(0,fallDistance)))/gravity;
  const proxies=ghosts.map((ghost,layer)=>({ghost,layer,time:0})),flight={el:clone,timeline:null};
  const paint=()=>{for(const g of proxies){const t=g.time,windup=smooth(0,.1,t)*40,f=Math.max(0,t-.1),x=Math.cos(angle)*velocity*f,y=windup+vy*f+.5*gravity*f*f;g.ghost.style.transform='translate3d('+x+'px,'+y+'px,0) rotate('+(rotation*Math.min(1,f/duration))+'deg) scale('+scale+')';}};
  paint();flight.timeline=gsap.timeline({onUpdate:paint,onComplete:()=>{clone.remove();endingFlights.delete(flight);}}).to(proxies,{time:duration+.1,duration:duration+.1,ease:'none',stagger:.0125});endingFlights.add(flight);
  letter.recovery?.kill();letter.recovery=gsap.fromTo(letter,{recoveryScale:0},{recoveryScale:1,duration:1.5,ease:scaleEase,onUpdate:()=>{for(const ghost of letter.ghosts)ghost.style.transform='scale('+letter.recoveryScale+')';}});
  el.dataset.endingThrows=String(++endingThrowCount);
 }
 function updateControls(){for(const[k,v]of Object.entries(values()))$('strand-'+k+'-value').textContent=k==='count'?v:String(v.toFixed(2));}
 function distance(){return values().distance*innerHeight;}
 // Add scroll room only while the roots grow, before the question begins.
 function rootScrollExtra(){return innerHeight*.75;}
 function storyScroll(y){const start=innerHeight*.34,end=Math.max(start+1,distance()*.20),extra=rootScrollExtra();if(y<=start)return y;if(y<end+extra)return start+(y-start)*(end-start)/(end-start+extra);return y-extra;}
 function totalDistance(){return distance()+rootScrollExtra()+innerHeight*1.7;}
 function sizePage(){state.pageDistance=distance()+rootScrollExtra();paper.style.height=(state.pageDistance+innerHeight*2)+'px';if(state.active)document.body.style.height=(totalDistance()+innerHeight)+'px';}
 function edgeColour(){const hex=$('background-color').value;return hex.slice(1).match(/../g).map(n=>parseInt(n,16));}
 function applyEdge(){
  const c=state.edge?.[0]||edgeColour();el.style.setProperty('--edge-color','rgb('+c.join(',')+')');
 }

 // Native-resolution GPU edge; CPU samples only locate the root attachment contour.
 // Warped fbm, fraying and fibre runs adapted from Codrops Seam 01 (MIT).
 const inkCanvas=document.createElement('canvas'),inkGL=inkCanvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});
 if(!inkGL)throw new Error('The soil transition requires WebGL 2.');
 inkCanvas.className='record-ink';inkCanvas.setAttribute('aria-hidden','true');el.insertBefore(inkCanvas,seamEl);
 let inkField,inkProfiles,inkHeight=0,inkAbove=0,inkSpread=0,inkColumns=0,inkPaintKey='',inkProfileSpread=-1;
 const mix=(a,b,t)=>a+(b-a)*t;
 function hash(x,y){let n=(Math.imul(x,374761393)+Math.imul(y,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return ((n^(n>>>16))>>>0)/4294967295;}
 function noise(x,y){const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);}
 function fbm(x,y){let v=0,a=.5;for(let i=0;i<5;i++){v+=a*noise(x,y);x=x*2.03+17.1;y=y*2.03+17.1;a*=.5;}return v/.97;}
 function soilReach(px,py,v){
  const q=px/(300*v.soilScale),qy=py/(300*v.soilScale),wx=fbm(q,0),wy=fbm(q+5.2,1.3);
  const lobes=fbm(q*1.2+2.2*wx,qy*1.2+2.2*wy),fray=fbm(px/24+3*wx,py/24+3*wy),runs=Math.pow(fbm(px/26,py/140),3);
  const g=(lobes-.40)*2.8+(fray-.5)*(.12+v.soilRoughness*.40)+runs*.28;
  return (g>0?inkHeight-inkAbove:inkAbove)*Math.tanh(g*(g>0?1.5:2));
 }
 const compile=(type,source)=>{const shader=inkGL.createShader(type);inkGL.shaderSource(shader,source);inkGL.compileShader(shader);if(!inkGL.getShaderParameter(shader,inkGL.COMPILE_STATUS))throw Error(inkGL.getShaderInfoLog(shader));return shader;};
 const inkProgram=inkGL.createProgram();
 inkGL.attachShader(inkProgram,compile(inkGL.VERTEX_SHADER,`#version 300 es
 void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0,1);}`));
 inkGL.attachShader(inkProgram,compile(inkGL.FRAGMENT_SHADER,`#version 300 es
 precision highp float;precision highp int;
 uniform vec2 uSize;uniform float uDpr,uAbove,uSpread,uScale,uRoughness;uniform sampler2D uEdge;
 out vec4 color;
 float hash(ivec2 p){uint n=uint(p.x)*374761393u+uint(p.y)*668265263u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967295.;}
 float noise(vec2 p){ivec2 i=ivec2(floor(p));vec2 f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+ivec2(1,0)),u.x),mix(hash(i+ivec2(0,1)),hash(i+ivec2(1,1)),u.x),u.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v/.97;}
 void main(){vec2 px=vec2(gl_FragCoord.x/uDpr,uSize.y-gl_FragCoord.y/uDpr);px.y-=uAbove;
 vec2 q=px/(300.*uScale),w=vec2(fbm(vec2(q.x,0)),fbm(vec2(q.x+5.2,1.3)));
 float lobes=fbm(q*1.2+2.2*w),fray=fbm(px/24.+3.*w),runs=pow(fbm(vec2(px.x/26.,px.y/140.)),3.);
 float g=(lobes-.40)*2.8+(fray-.5)*(.12+uRoughness*.40)+runs*.28;
 float reach=(g>0.?uSize.y-uAbove:uAbove)*tanh(g*(g>0.?1.5:2.))*uSpread;
 float s=px.y-reach,aa=max(fwidth(s),.65);float alpha=1.-smoothstep(-aa,aa,s);
 color=vec4(texture(uEdge,vec2(px.x/uSize.x,.5)).rgb,alpha);}`));
 inkGL.linkProgram(inkProgram);if(!inkGL.getProgramParameter(inkProgram,inkGL.LINK_STATUS))throw Error(inkGL.getProgramInfoLog(inkProgram));
 const inkUniform=Object.fromEntries(['uSize','uDpr','uAbove','uSpread','uScale','uRoughness','uEdge'].map(n=>[n,inkGL.getUniformLocation(inkProgram,n)]));
 const inkTexture=inkGL.createTexture();inkGL.bindTexture(inkGL.TEXTURE_2D,inkTexture);inkGL.texParameteri(inkGL.TEXTURE_2D,inkGL.TEXTURE_MIN_FILTER,inkGL.LINEAR);inkGL.texParameteri(inkGL.TEXTURE_2D,inkGL.TEXTURE_MAG_FILTER,inkGL.LINEAR);inkGL.texParameteri(inkGL.TEXTURE_2D,inkGL.TEXTURE_WRAP_S,inkGL.CLAMP_TO_EDGE);inkGL.texParameteri(inkGL.TEXTURE_2D,inkGL.TEXTURE_WRAP_T,inkGL.CLAMP_TO_EDGE);
 let inkDpr=1;
 function buildInk(){
  inkPaintKey='';inkProfileSpread=-1;
  const v=values();inkAbove=Math.min(85,innerHeight*.12);inkHeight=Math.min(230,innerHeight*.30)*v.soilDepth+inkAbove;
  inkDpr=devicePixelRatio||1;inkCanvas.width=Math.ceil(innerWidth*inkDpr);inkCanvas.height=Math.ceil(inkHeight*inkDpr);inkCanvas.style.height=inkHeight+'px';
  inkColumns=Math.ceil(innerWidth/2);const rows=Math.ceil(inkHeight/2);inkField=new Float32Array(inkColumns*rows);inkProfiles=new Float32Array(inkColumns);
  for(let x=0;x<inkColumns;x++)for(let y=0;y<rows;y++)inkField[y*inkColumns+x]=soilReach(x*2,y*2-inkAbove,v);
 }
 function inkOffset(x){return inkProfiles?.[Math.max(0,Math.min(inkColumns-1,Math.round(x/2)))]||0;}
 function drawInk(){
  inkSpread=smooth(0,innerHeight*.30,state.y);inkCanvas.style.transform='translate3d(0,'+(innerHeight-state.rootScroll-inkAbove-1)+'px,0)';
  if(innerHeight-state.rootScroll+inkHeight<0)return;
  if(inkSpread!==inkProfileSpread){for(let x=0;x<inkColumns;x++){let tip=-inkAbove;for(let y=0;y<Math.ceil(inkHeight/2);y++){const py=y*2-inkAbove;if(inkField[y*inkColumns+x]*inkSpread<py)break;tip=py;}inkProfiles[x]=tip;}inkProfileSpread=inkSpread;}
  const v=values(),colours=state.edge||[edgeColour()],key=inkSpread+'|'+v.soilScale+'|'+v.soilRoughness+'|'+JSON.stringify(colours);if(key===inkPaintKey)return;inkPaintKey=key;const pixels=new Uint8Array(colours.flatMap(c=>[...c,255]));
  inkGL.useProgram(inkProgram);inkGL.viewport(0,0,inkCanvas.width,inkCanvas.height);inkGL.bindTexture(inkGL.TEXTURE_2D,inkTexture);inkGL.texImage2D(inkGL.TEXTURE_2D,0,inkGL.RGBA,colours.length,1,0,inkGL.RGBA,inkGL.UNSIGNED_BYTE,pixels);
  inkGL.uniform2f(inkUniform.uSize,innerWidth,inkHeight);inkGL.uniform1f(inkUniform.uDpr,inkDpr);inkGL.uniform1f(inkUniform.uAbove,inkAbove);inkGL.uniform1f(inkUniform.uSpread,inkSpread);inkGL.uniform1f(inkUniform.uScale,v.soilScale);inkGL.uniform1f(inkUniform.uRoughness,v.soilRoughness);inkGL.uniform1i(inkUniform.uEdge,0);inkGL.drawArrays(inkGL.TRIANGLES,0,3);
 }
 const seam={get edgeAbove(){return inkAbove;},edgeOffset:inkOffset,el:seamEl,hero:$('scene'),next:intro,settings:values,continuous:false,naturalEnds:true,
  get scroll(){return state.rootScroll;},
  get travel(){return Math.max(0,state.y-innerHeight*.34);},room:{down:()=>innerHeight*.65*values().length/1.25},
  photo:{colours:(top,height,cols)=>col=>state.edge?.[Math.min(state.edge.length-1,Math.floor(col/cols*state.edge.length))]||edgeColour()},
  onChange:fn=>changed=fn,onSplit:fn=>split=fn};
 // Same SlowMo(0.25, 0.95, false) movement used by DoNotScroll.
 // GSAP EasePack, Copyright 2008–2026 GreenSock, https://gsap.com/standard-license.
 function moveEase(p){let r=p+(.5-p)*.95,t;if(p<.375){t=1-p/.375;return r-t*t*t*t*r;}if(p>.625){t=(p-.625)/.375;return r+(p-r)*t*t*t*t;}return r;}
 // Sample the reference CustomEase path once: M0,0 C.445,0 .39,.583 .426,.707 .457,.816 .424,1 1,1.
 const scaleSamples=[];
 for(let segment=0;segment<2;segment++){
  const v=segment?[.426,.707,.457,.816,.424,1,1,1]:[0,0,.445,0,.39,.583,.426,.707];
  for(let j=0;j<=256;j++){const t=j/256,u=1-t;scaleSamples.push([u*u*u*v[0]+3*u*u*t*v[2]+3*u*t*t*v[4]+t*t*t*v[6],u*u*u*v[1]+3*u*u*t*v[3]+3*u*t*t*v[5]+t*t*t*v[7]]);}
 }
 function scaleEase(p){let a=0,b=scaleSamples.length-1;while(b-a>1){const m=(a+b)>>1;if(scaleSamples[m][0]<p)a=m;else b=m;}const l=scaleSamples[a],r=scaleSamples[b];return l[1]+(r[1]-l[1])*(p-l[0])/(r[0]-l[0]||1);}
 function buildText(){
  textMotion?.kill();textStates=[];
  subtitle.style.transform='none';
  const glyphs=[...question.querySelectorAll('.next__char')],box=question.getBoundingClientRect(),subtitleTop=subtitle.getBoundingClientRect().top,subtitleHeight=subtitle.offsetHeight,lineHeight=parseFloat(getComputedStyle(question).lineHeight);
  const ghosts=[...question.querySelectorAll('.record-ghost')];
  for(const char of glyphs){const r=char.getBoundingClientRect();for(const ghost of char.querySelectorAll('.record-ghost')){ghost.style.transformOrigin=(box.left+box.width/2-r.left)+'px '+(box.top+box.height/2-r.top)+'px';textStates.push({el:ghost,y:0,scrollScale:1,front:ghost===char.querySelector('.record-ghost'),top:r.top,bottom:r.bottom,originY:box.top+box.height/2});}}
  // Long copy needs a bounded stagger; the four layers still arrive in order.
  const layerStagger=i=>Math.floor(i/4)*.0005+(i%4)*.012,travel=(innerHeight*.5+question.clientHeight*.5)/.3;
  textMotion=gsap.timeline({paused:true,onUpdate:()=>{
   for(const g of textStates)g.el.style.transform='translate3d(0,'+g.y+'px,0) scale('+g.scrollScale+')';
   let top=Infinity,bottom=-Infinity,largest=0;
   for(const g of textStates)if(g.front){top=Math.min(top,g.y+g.originY+(g.top-g.originY)*g.scrollScale);bottom=Math.max(bottom,g.y+g.originY+(g.bottom-g.originY)*g.scrollScale);largest=Math.max(largest,g.scrollScale);}
   const pose=textMotion.progress(),hold=smooth(.30,.43,pose)*(1-smooth(.72,.88,pose));
   intro.style.transform='translateY('+((innerHeight/2-(top+bottom)/2)*hold)+'px)';
   const smallScale=largest/1.26;
   subtitle.style.transform='translateY('+(bottom+lineHeight*largest*.75-subtitleTop-subtitleHeight*(1-smallScale)/2)+'px) scale('+smallScale+')';
  }}).fromTo(textStates,{y:travel},{y:-travel,duration:.9,stagger:layerStagger,ease:moveEase},0)
    .fromTo(textStates,{scrollScale:.3},{scrollScale:1.26,duration:.4,stagger:{amount:.1},ease:scaleEase},.25);
  textMotion.progress(.000001).progress(0);
 }
 function build(){
  clearEnding();
  const hidden=el.hidden;el.hidden=false;el.style.visibility='hidden';
  textMotion?.kill();intro.style.transform='none';subtitle.style.transform='none';subtitle.style.marginTop=(parseFloat(getComputedStyle(question).lineHeight)*1.26)+'px';for(const g of question.querySelectorAll('.record-ghost'))g.style.transform='none';
  const top=innerHeight+innerHeight*.65*values().length/1.25;
  intro.style.top=top+'px';pinY=top+intro.offsetHeight/2-innerHeight*.52;
  buildInk();if(roots)split();else roots=createFieldRoots(seam);
  intro.style.top=(innerHeight*.5-question.offsetHeight*.5)+'px';buildText();
  el.querySelector('.record-ending').style.setProperty('--ending-title-height',endingTitle.offsetHeight+'px');
  sizePage();updateControls();applyEdge();state.dirty=true;el.hidden=hidden;el.style.removeProperty('visibility');
 }
 for(const k of Object.keys(defaults))$('strand-'+k).addEventListener('input',()=>{
  const fraction=state.active?clip(scrollY/(state.pageDistance||distance())):0;
  if(k==='distance'){sizePage();scrollTo(0,fraction*state.pageDistance);state.y=storyScroll(fraction*state.pageDistance);}if(k.startsWith('soil')){buildInk();}else build();
  updateControls();state.dirty=true;try{localStorage.setItem(storage,JSON.stringify(values()));}catch(e){}
 });
 function enter(delta=0){
  if(state.active)return;el.style.setProperty('--question-ink',getComputedStyle(document.getElementById('stage-title')).color);state.active=true;state.y=0;state.last=-1;el.hidden=false;
  document.documentElement.classList.add('field-open');document.body.classList.add('field-open');
  state.background=$('background-color').value;state.capture=true;
  sizePage();scrollTo(0,Math.min(Math.max(delta,0),innerHeight*.18));state.dirty=true;
 }
 function leave(){
  clearEnding();silenceRoots();
  state.active=false;state.y=0;scrollTo(0,0);document.documentElement.classList.remove('field-open');document.body.classList.remove('field-open');
  document.body.style.removeProperty('height');document.body.style.removeProperty('--story-y');document.body.style.removeProperty('--story-alpha');document.body.style.removeProperty('background');
  el.hidden=true;video.pause();video.muted=true;state.videoVisible=false;window.backgroundMusic?.setVideoActive(false);state.last=-1;state.capture=false;still.width=still.height=1;
 }
 function afterRender(renderer){
  if(!state.active){state.frozen=false;document.body.classList.remove('field-frozen');return;}
  if(!state.capture)return;state.capture=false;
  still.width=renderer.domElement.width;still.height=renderer.domElement.height;stillContext.drawImage(renderer.domElement,0,0);
  state.frozen=true;document.body.classList.add('field-frozen');
  // Read the rendered outgoing bottom edge, not an invented root colour.
  const gl=renderer.getContext(),w=gl.drawingBufferWidth,pixels=new Uint8Array(w*4);
  gl.readPixels(0,0,w,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const previousEdge=JSON.stringify(state.edge);
  state.edge=Array.from({length:Math.ceil(innerWidth/8)},(_,i)=>{const x=Math.min(w-1,Math.floor(i/Math.ceil(innerWidth/8)*w));return Array.from(pixels.slice(x*4,x*4+3));});
  applyEdge();if(JSON.stringify(state.edge)!==previousEdge)build();
 }
 function tick(dt){
  if(!state.active)return;
  const previousTravel=clip((state.y-innerHeight*.34)/(2+roots.depth+innerHeight));
  const target=storyScroll(Math.min(scrollY,totalDistance()));state.y+=(target-state.y)*(1-Math.exp(-dt*18));if(Math.abs(target-state.y)<.25)state.y=target;
  const p=clip(state.y/distance()),background=$('background-color').value;
  const travel=clip((state.y-innerHeight*.34)/(2+roots.depth+innerHeight));
  // Fade with the root passage, before the rising question takes focus.
  const soundStart=innerHeight*.34/distance();
  const rootEnvelope=smooth(soundStart,soundStart+innerHeight*.25/distance(),p)*(1-smooth(.20,.34,p));
  updateRootAudio(Math.abs(travel-previousTravel)*(2+roots.depth+innerHeight)/Math.max(dt,.001),rootEnvelope,dt);
  if(background!==state.background){state.background=background;state.capture=true;el.style.setProperty('--question-ink',getComputedStyle(document.getElementById('stage-title')).color);}
  const key=[state.y.toFixed(2),background,innerWidth,innerHeight].join();
  if(key===state.last&&!state.dirty)return;state.last=key;state.dirty=false;
  document.body.style.setProperty('--story-y',-state.y+'px');document.body.style.setProperty('--story-alpha','1');
  document.body.style.background='#fff';
  const edge=innerHeight-state.y;
  paper.style.transform='translate3d(0,'+(edge-inkAbove)+'px,0)';
  const extent=Math.max(1,roots.extent),lead=innerHeight+extent*.35,tail=extent*.30;
  state.rootScroll=state.y<=lead?state.y:lead+tail*(1-Math.exp(-(state.y-lead)/tail));
  seamEl.style.transform='translate3d(0,'+(-state.rootScroll)+'px,0)';
  drawInk();
  const textProgress=clip((p-.20)/.60);textMotion.progress(textProgress);
  const rootOpacity=1-smooth(.38,.66,textProgress);seamEl.style.opacity=rootOpacity;
  if(rootOpacity>0)changed();
  // Image Expansion Typography, effect 2: small rounded inline window expands;
  // surrounding words move apart with its bounds. Once open, the whole group scrolls up.
  const arrive=smooth(.78,1,p),entrance=smooth(.70,.80,p),exit=Math.max(0,state.y-distance()-innerHeight*.2);
  const fullWidth=innerWidth<=700?innerWidth*.84:Math.min(innerWidth*.74,innerHeight*1.16),filmWidth=fullWidth*(.16+.84*arrive);
  filmStage.style.setProperty('--film-width',filmWidth+'px');filmStage.style.setProperty('--film-height',filmWidth*9/16+'px');
  filmStage.style.transform='translate3d(0,'+((1-entrance)*innerHeight*.70-exit)+'px,0)';
  filmStage.style.opacity=smooth(.70,.76,p);video.controls=arrive>.9;media.style.width=filmWidth+'px';media.style.transform='translate(-50%,-50%)';media.style.opacity=1;
  el.querySelector('.record-after').style.transform='translate3d(0,'+(-Math.min(exit,innerHeight))+'px,0)';
  if(exit<innerHeight*.90&&(endingFlights.size||endingLetters.some(letter=>letter.recoveryScale<1)))clearEnding();
  el.dataset.afterProgress=clip(exit/innerHeight).toFixed(4);el.dataset.videoScale=(.16+.84*arrive).toFixed(4);
  el.querySelector('.record-cue').style.opacity=1-smooth(.65,.8,p);
  const visible=arrive>.90&&exit<innerHeight*.85;
  window.backgroundMusic?.setVideoActive(visible&&!!video.getAttribute('src'));
  if(video.getAttribute('src')){
   if(visible&&!state.videoVisible){video.muted=!state.sound;video.play().catch(()=>{});}
   if(!visible&&state.videoVisible)video.pause();state.videoVisible=visible;video.volume=state.sound?smooth(.8,1,p):0;
  }
  el.dataset.progress=p.toFixed(4);el.dataset.expansion=arrive.toFixed(4);el.dataset.rootSegments=roots.segmentCount;el.dataset.rootDepth=roots.depth.toFixed(2);el.dataset.rootOpacity=rootOpacity.toFixed(4);el.dataset.rootExtent=roots.extent.toFixed(2);el.dataset.rootDrawn=roots.drawnCount;el.dataset.seamY=edge.toFixed(2);el.dataset.rootGrowth=seam.travel.toFixed(2);el.dataset.frozen=String(state.frozen);el.dataset.textProgress=textProgress.toFixed(4);
 }
 addEventListener('wheel',e=>{
  if(!state.active||e.target.closest('aside')||e.ctrlKey)return;
  throwEnding(e.deltaY,e);
  if(scrollY<=0&&e.deltaY<0){e.preventDefault();leave();resume(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));}
 },{capture:true,passive:false});
 addEventListener('keydown',e=>{if(state.active&&e.key==='Escape'){leave();e.preventDefault();}});
 addEventListener('keydown',e=>{if(['ArrowDown','PageDown',' '].includes(e.key)&&!e.defaultPrevented&&!e.isComposing&&!e.target.isContentEditable&&!e.metaKey&&!e.altKey)throwEnding(1,e);});
 let endingTouchY=null;
 addEventListener('touchstart',e=>{endingTouchY=e.touches.length===1?e.touches[0].clientY:null;},{passive:true});
 addEventListener('touchmove',e=>{if(endingTouchY===null||e.touches.length!==1)return;const y=e.touches[0].clientY;throwEnding(endingTouchY-y,e);endingTouchY=y;},{passive:true});
 const picker=$('record-file');$('record-load').onclick=()=>picker.click();
 if(video.getAttribute('src')){$('record-sound').disabled=false;$('record-file-name').textContent='Habitat video.mp4';}
 picker.onchange=()=>{
  const file=picker.files[0];if(!file)return;
  video.pause();video.removeAttribute('src');if(state.objectURL)URL.revokeObjectURL(state.objectURL);
  state.objectURL=URL.createObjectURL(file);video.src=state.objectURL;state.videoVisible=false;video.hidden=false;placeholder.hidden=true;video.muted=true;state.sound=false;
  $('record-sound').disabled=false;$('record-sound').textContent='Enable video sound';$('record-file-name').textContent=file.name;state.dirty=true;
 };
 function setAudio(enabled){
  state.sound=enabled;video.muted=!enabled;
  if(enabled){rootAudio.volume=0;rootAudio.play().then(()=>{if(!state.active||rootSoundTarget===0)rootAudio.pause();}).catch(()=>{});}else silenceRoots();video.volume=state.active&&state.videoVisible&&enabled?smooth(.8,1,clip(state.y/distance())):0;
  // Unlock this media element during the explicit entry gesture; keep it paused offscreen.
  if(enabled)video.play().then(()=>{if(!state.videoVisible)video.pause();}).catch(()=>{});
  $('record-sound').textContent=enabled?'Mute video sound':'Enable video sound';state.dirty=true;
 }
 $('record-sound').onclick=()=>setAudio(!state.sound);
 video.addEventListener('error',()=>{$('record-file-name').textContent='This browser cannot play this file. Try an MP4 (H.264).';});
 addEventListener('resize',build);build();
 return {get active(){return state.active;},get needsRender(){return !state.active||state.capture;},invalidate(){if(state.active){state.capture=true;state.dirty=true;}},setAudio,enter,leave,tick,afterRender};
};

