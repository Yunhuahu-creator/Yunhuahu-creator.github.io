(async () => {
  const video = document.querySelector('#field-recording video');
  async function prepareVideo() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./delivery-worker.js');
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error('Delivery worker did not activate.')), 15000);
          navigator.serviceWorker.addEventListener('controllerchange', () => {clearTimeout(timer); resolve();}, {once: true});
        });
        video.src = video.dataset.src;
        return;
      } catch (e) {console.warn('Using direct video part loading:', e.message);}
    }
    // Fallback for browsers that disable service workers; preserve the MP4 exactly.
    const media = await (await fetch('./delivery.json')).json();
    const parts = await Promise.all(media.parts.map(async p => {
      const response = await fetch(p);
      if (!response.ok) throw Error('Video part unavailable.');
      return response.arrayBuffer();
    }));
    video.src = URL.createObjectURL(new Blob(parts, {type: 'video/mp4'}));
  }
  try {
    await prepareVideo();
    for (const entry of document.querySelectorAll('script[type="application/x-earth-script"]')) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = entry.dataset.src;
        script.onload = resolve;
        script.onerror = () => reject(Error('Unable to load ' + entry.dataset.src));
        document.body.append(script);
      });
    }
  } catch (error) {
    const message = document.getElementById('load-error');
    if (message) {message.hidden = false; message.textContent = 'Unable to load this experience. Please refresh. (' + error.message + ')';}
    console.error(error);
  }
})();
