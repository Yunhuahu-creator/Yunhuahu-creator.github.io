// Background music has its own volume and never changes the scene or video volume.
(()=>{
 const audio=document.getElementById('background-music'),slider=document.getElementById('music-volume'),output=document.getElementById('music-volume-value');
 const storage='earthAgain.musicVolume';let enabled=false,videoActive=false,level=.18;
 try{const saved=window.__presentationSettings?.musicVolume??localStorage.getItem(storage);if(saved!==null&&Number.isFinite(Number(saved)))level=Math.max(0,Math.min(1,Number(saved)));}catch{}
 audio.volume=0;slider.value=Math.round(level*100);output.textContent=slider.value+'%';
 function foreground(){return !document.hidden&&document.hasFocus();}
 function fade(duration){const target=enabled&&foreground()&&!videoActive?level:0;audio.dataset.targetVolume=target.toFixed(3);gsap.to(audio,{volume:target,duration,ease:'sine.inOut',overwrite:true});}
 function pauseBackground(){gsap.killTweensOf(audio);audio.volume=0;audio.dataset.targetVolume='0.000';audio.pause();}
 function resume(duration){if(!enabled||!foreground()){pauseBackground();return;}audio.play().then(()=>{if(foreground())fade(duration);else pauseBackground();}).catch(error=>{audio.dataset.error=error.message;});}
 function syncVisibility(){if(!foreground())pauseBackground();else resume(1.5);}
 document.addEventListener('visibilitychange',syncVisibility);
 window.addEventListener('blur',pauseBackground);
 window.addEventListener('focus',syncVisibility);
 window.addEventListener('pagehide',pauseBackground);
 window.addEventListener('pageshow',syncVisibility);
 slider.addEventListener('input',()=>{level=Number(slider.value)/100;output.textContent=slider.value+'%';try{localStorage.setItem(storage,String(level));}catch{}fade(.25);});
 const ready=new Promise((resolve,reject)=>{if(audio.readyState>=3){resolve();return;}audio.addEventListener('canplay',resolve,{once:true});audio.addEventListener('error',()=>reject(Error('Background music could not be loaded')),{once:true});});
 ready.catch(error=>{audio.dataset.error=error.message;});
 window.backgroundMusic={ready,
  enter(withAudio){enabled=withAudio;gsap.killTweensOf(audio);audio.volume=0;audio.dataset.enabled=String(enabled);resume(2.5);},
  setVideoActive(active){if(videoActive===active)return;videoActive=active;audio.dataset.videoActive=String(active);fade(active?1.2:2);}
 };
})();
