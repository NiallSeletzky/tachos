// Static light trails. Redraw only when the canvas changes size.
(() => {
  const canvas = document.getElementById('lightspeed'), ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width = 0, height = 0;
  const colors = ['187,163,255', '120,167,255', '255,173,125', '248,223,207'];
  const trails = Array.from({length:160}, (_, i) => ({
    angle:i*2.399963, distance:((i*71)%157)/157,
    length:.07+(i%7)*.016, color:colors[i%4]
  }));
  function draw() {
    ctx.clearRect(0,0,width,height);
    const cx=width*.79, cy=height*.47, radius=Math.max(width,height)*1.1;
    ctx.globalCompositeOperation='lighter';
    for (const t of trails) {
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
  }
  function resize(){
    const r=canvas.getBoundingClientRect();width=r.width;height=r.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  }
  new ResizeObserver(resize).observe(canvas);
})();
