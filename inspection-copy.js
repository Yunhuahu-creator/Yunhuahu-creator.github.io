// Fixed stage copy, shown only while inspecting the current frame.
window.inspectionStage=f=>[[1,32],[160,192],[352,384],[581,625],[773,817]].findIndex(([first,last])=>f>=first&&f<=last);
window.createInspectionCopy=({onExit}={})=>{
 const root=document.getElementById('inspect-copy');
 const copy=[
  ['ORIGIN','Before it became an object, this material belonged to the earth.','My research began with water: how does its passage through rock shape what it carries?'],
  ['FORM','The filter lets water pass through,','while its surface carries traces of water and everyday use.'],
  ['FRACTURE','What caused this filter to break?','I began to question the combined effects of water, accumulated deposits and repeated scrubbing.'],
  ['WEATHERING','Water’s influence continues beyond the filter’s use.','Over time, corrosion changes the fragment’s colour and surface.'],
  ['HABITAT','Could the water involved in a material’s deterioration also support another beginning?','Here, I imagine the fragment becoming a habitat.']
 ];
 root.replaceChildren();
 const title=document.createElement('h2');title.className='inspection-title';root.append(title);
 const blocks=[0,1].map(()=>{const p=document.createElement('p');p.className='inspection-note';root.append(p);return p;});
 const hoverTip=document.createElement('span');hoverTip.id='inspection-hover-tip';hoverTip.textContent='click the object to explore';hoverTip.hidden=true;document.body.append(hoverTip);
 const exploreHint=document.createElement('span');exploreHint.id='inspection-explore-hint';exploreHint.textContent='drag to explore in 360°';document.body.append(exploreHint);
 const exit=document.createElement('button');exit.id='inspection-exit';exit.type='button';exit.textContent='← EXIT';exit.setAttribute('aria-label','Exit 360° exploration');exit.onclick=()=>onExit?.();document.body.append(exit);
 function place(){const heading=document.getElementById('stage-title').getBoundingClientRect(),captionOffset=Number(gsap.getProperty('#captions','y'))||0;title.style.top=(heading.top-captionOffset+heading.height/2-title.offsetHeight/2+innerHeight*.055)+'px';exploreHint.style.left='50%';exploreHint.style.top=(parseFloat(getComputedStyle(exit).top)+exit.offsetHeight/2-exploreHint.offsetHeight/2)+'px';}

 function layout(){
  const show=root.dataset.available==='true';root.dataset.callouts=String(show);if(!show)return;
  const heading=title.getBoundingClientRect(),gap=Math.min(48,innerWidth*.04),pad=innerWidth*.04;
  const width=Math.max(100,Math.min(620,heading.left-gap-pad));
  blocks.forEach((p,i)=>{p.style.width=width+'px';p.style.left=(i===0?heading.left-gap-width:heading.right+gap)+'px';p.style.top=(heading.top+heading.height/2-p.offsetHeight/2)+'px';p.style.textAlign=i===0?'right':'left';});
 }
 function stage(f){const index=window.inspectionStage(f);root.dataset.available=String(index>=0);root.setAttribute('aria-hidden',String(index<0));if(index<0){root.dataset.stage='';title.textContent='';blocks.forEach(p=>p.textContent='');place();return;}root.dataset.stage=copy[index][0];title.textContent=copy[index][0];blocks.forEach((p,i)=>p.textContent=copy[index][i+1]);place();}
 let hoverKey='';function hover(x,y,show){const key=show?x+','+y:'hidden';if(key===hoverKey)return;hoverKey=key;hoverTip.hidden=!show;if(show){hoverTip.style.left=Math.min(innerWidth-hoverTip.offsetWidth-12,x+18)+'px';hoverTip.style.top=Math.min(innerHeight-30,y+20)+'px';}}
 addEventListener('resize',place);
 return {stage,hover,layout};
};
