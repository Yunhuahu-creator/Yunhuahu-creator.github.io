// Reuse the cover's CC Lens mapping on the live scene, without its grain or waves.
window.createInspectionLens=(THREE,material,canvas)=>{
 const pointer=new THREE.Vector2(.5,.5),eased=pointer.clone();let inside=false;
 const uniforms={inspectPointer:{value:eased},inspectViewport:{value:new THREE.Vector2(innerWidth,innerHeight)},inspectLens:{value:0}};
 Object.assign(material.uniforms,uniforms);
 const lensFunctions=`
 uniform vec2 inspectPointer;uniform vec2 inspectViewport;uniform float inspectLens;
 vec2 inspectionUv;
 float getCCLensScale(float distortion,float radius2){if(distortion>=0.0)return 1.0+distortion*radius2;return 1.0/(1.0-distortion*radius2);}
 vec2 getCCLensUv(vec2 uv,vec2 resolution,float distortion){
  vec2 centeredUv=uv-0.5;vec2 aspectScale=vec2(resolution.x/resolution.y,1.0);
  vec2 centeredPosition=centeredUv*aspectScale;float radius2=dot(centeredPosition,centeredPosition);
  float lensScale=getCCLensScale(distortion,radius2);vec2 distortedPosition=centeredPosition*lensScale;
  vec2 distortedCenteredUv=distortedPosition/aspectScale;vec2 distortedUv=distortedCenteredUv+0.5;
  vec2 distortionOffset=distortedUv-uv;return uv-distortionOffset;
 }
 `;
 material.fragmentShader=lensFunctions+material.fragmentShader
  .replaceAll('texture2D(image,vUv)','texture2D(image,inspectionUv)')
  .replaceAll('texture2D(beam,vUv)','texture2D(beam,inspectionUv)')
  .replaceAll('texture2D(particles,vUv','texture2D(particles,inspectionUv')
  .replaceAll('texture2D(bloom,vUv)','texture2D(bloom,inspectionUv)')
  .replace('void main(){',`void main(){
   vec2 delta=(vUv-inspectPointer)*inspectViewport;
   float halfSize=min(135.0,min(inspectViewport.x,inspectViewport.y)*.17);
   float mask=step(-halfSize,delta.x)*(1.0-step(halfSize,delta.x))*step(-halfSize,delta.y)*(1.0-step(halfSize,delta.y))*inspectLens;
   vec2 squareUv=delta/(halfSize*2.0)+.5;
   vec2 distorted=getCCLensUv(squareUv,vec2(1.0),.35);
   vec2 magnified=inspectPointer+(distorted-.5)*(halfSize*2.0)/inspectViewport/2.0;
   inspectionUv=clamp(mix(vUv,magnified,mask),vec2(.0001),vec2(.9999));
  `)
  .replace('vec3 mist=',`vec2 separation=clamp(delta/halfSize,vec2(-1.0),vec2(1.0))*.0015*mask;
   subject.r=texture2D(image,inspectionUv+separation).r;
   subject.b=texture2D(image,inspectionUv-separation).b;vec3 mist=`);
 material.needsUpdate=true;
 canvas.addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth,1-e.clientY/innerHeight);inside=e.pointerType!=='touch';});
 canvas.addEventListener('pointerleave',()=>inside=false);
 return {rect(){return {x:eased.x*innerWidth,y:(1-eased.y)*innerHeight,half:Math.min(135,Math.min(innerWidth,innerHeight)*.17),opacity:uniforms.inspectLens.value};},update(active,dt){uniforms.inspectViewport.value.set(innerWidth,innerHeight);eased.lerp(pointer,1-Math.exp(-dt*14));uniforms.inspectLens.value+=((active&&inside?1:0)-uniforms.inspectLens.value)*(1-Math.exp(-dt*18));canvas.dataset.inspectionLens=uniforms.inspectLens.value.toFixed(3);canvas.dataset.lensMagnification='2.0';}};
};
