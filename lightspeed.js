// Decorative light trails: no dependencies or external requests.
(() => {
  const canvas = document.getElementById('lightspeed'), ctx = canvas.getContext('2d');
  if (!ctx) return;
  const button = document.getElementById('motion'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, width = 0, height = 0, frame = 0, last = 0;
  const colors = ['187,163,255', '120,167,255', '255,173,125', '248,223,207'];
  const trails = Array.from({length:160}, (_, i) => ({
    angle:i*2.399963, distance:((i*71)%157)/157, speed:.025+(i%9)*.003,
    length:.07+(i%7)*.016, color:colors[i%4]
  }));
  function draw(time) {
    const delta = last ? Math.min((time-last)/1000,.05) : 0; last=time;
    ctx.clearRect(0,0,width,height);
    const cx=width*.79, cy=height*.47, radius=Math.max(width,height)*1.1;
    ctx.globalCompositeOperation='lighter';
    for (const t of trails) {
      if (!paused) t.distance=(t.distance+delta*t.speed)%1;
      const start=t.distance*t.distance*radius+8, end=start+(t.length*t.distance+.008)*radius;
      const dx=Math.cos(t.angle),dy=Math.sin(t.angle)*.65;
      const x=cx+dx*start,y=cy+dy*start,ex=cx+dx*end,ey=cy+dy*end;
      const g=ctx.createLinearGradient(x,y,ex,ey);
      g.addColorStop(0,'rgba('+t.color+',0)');
      g.addColorStop(1,'rgba('+t.color+','+(.25+t.distance*.65)+')');
      ctx.strokeStyle=g;ctx.lineWidth=.5+t.distance*1.8;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    if (!paused && !document.hidden) frame=requestAnimationFrame(draw);
  }
  function restart(){cancelAnimationFrame(frame);last=0;draw(0);}
  function resize(){
    const r=canvas.getBoundingClientRect();width=r.width;height=r.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);restart();
  }
  function label(){button.textContent=paused?'Play animation':'Pause animation';button.setAttribute('aria-pressed',String(paused));}
  button.hidden=false;label();
  button.addEventListener('click',()=>{paused=!paused;label();restart();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;label();restart();});
  document.addEventListener('visibilitychange',restart);
  new ResizeObserver(resize).observe(canvas);
})();
