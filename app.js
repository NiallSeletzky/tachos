(() => {
  'use strict';
  const heroes = [...document.querySelectorAll('[data-hero]')];
  const replay = document.querySelector('#replay');
  const mute = document.querySelector('#mute');
  let sound = null;
  let soundTimer;
  function stopSound() {
    clearTimeout(soundTimer);
    if (sound) { sound.context.close().catch(() => {}); sound = null; }
    mute.hidden = true;
  }
  async function playSting() {
    stopSound();
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      const context = new Audio();
      const master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
      sound = { context, master, muted: false };
      mute.hidden = false; mute.textContent = 'Mute music'; mute.setAttribute('aria-pressed', 'false');
      // Original five-note D-minor fantasy fanfare. No sampled or third-party audio.
      const notes = [146.832, 220, 261.626, 349.228, 293.665];
      const start = context.currentTime + 0.06;
      notes.forEach((frequency, index) => {
        const at = start + 1.6 + index * 0.36;
        [1, 1.5, 2].forEach((ratio, voice) => {
          const oscillator = context.createOscillator();
          const filter = context.createBiquadFilter();
          const envelope = context.createGain();
          oscillator.type = voice === 0 ? 'sawtooth' : 'triangle';
          oscillator.frequency.value = frequency * ratio;
          filter.type = 'lowpass'; filter.frequency.value = 950;
          envelope.gain.setValueAtTime(0, at);
          envelope.gain.linearRampToValueAtTime(voice === 0 ? 0.3 : 0.13, at + 0.07);
          envelope.gain.exponentialRampToValueAtTime(0.001, at + (index === 4 ? 1.7 : 0.65));
          oscillator.connect(filter); filter.connect(envelope); envelope.connect(master);
          oscillator.start(at); oscillator.stop(at + 1.8);
        });
      });
      if (context.state === 'suspended') await context.resume();
      soundTimer = setTimeout(stopSound, 5800);
    } catch (_) { stopSound(); }
  }
  replay.addEventListener('click', () => {
    // Only an explicit user gesture creates/resumes audio; there is no load handler.
    const animated = [replay, ...heroes];
    animated.forEach(el => { el.style.animation = 'none'; });
    void replay.offsetWidth;
    animated.forEach(el => { el.style.animation = ''; });
    playSting();
  });
  mute.addEventListener('click', () => {
    if (!sound) return;
    sound.muted = !sound.muted;
    sound.master.gain.setValueAtTime(sound.muted ? 0 : 0.18, sound.context.currentTime);
    mute.textContent = sound.muted ? 'Unmute music' : 'Mute music';
    mute.setAttribute('aria-pressed', String(sound.muted));
  });
  window.addEventListener('pagehide', stopSound);
})();
