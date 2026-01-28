// visuals.js (no module)
// Force neon animated fallback background (no Three.js), ensure visible even on file://

(function initNeonBackground(){
  // Remove previous layers
  const old = document.getElementById('bg-neon'); if (old) old.remove();

  const bg = document.createElement('canvas');
  bg.id = 'bg-neon';
  Object.assign(bg.style, { 
    position: 'fixed', 
    inset: '0', 
    width: '100vw', 
    height: '100vh',
    height: '100dvh', // Dynamic viewport height for mobile
    zIndex: '0', 
    pointerEvents: 'none',
    willChange: 'auto' // Performance optimization
  });
  document.body.prepend(bg);
  const ctx = bg.getContext('2d');
  let w = 0, h = 0;
  // Limit DPR for performance on high-DPI devices
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  
  function resize() { 
    w = bg.width = Math.round(innerWidth * dpr); 
    h = bg.height = Math.round(innerHeight * dpr); 
  }
  resize(); 
  addEventListener('resize', resize);
  // Listen for orientation changes
  addEventListener('orientationchange', () => setTimeout(resize, 100));

  const blobs = new Array(6).fill(0).map((_,i)=>({ x:Math.random(), y:Math.random(), r:0.18+Math.random()*0.32, hue:(i*55+20)%360, vx:(Math.random()*0.25+0.15)*(Math.random()<0.5?-1:1), vy:(Math.random()*0.25+0.15)*(Math.random()<0.5?-1:1) }));

  function render(){
    // Base gradient background
    const g1 = ctx.createLinearGradient(0,0,w,h);
    g1.addColorStop(0, '#07121f');
    g1.addColorStop(1, '#02060e');
    ctx.fillStyle = g1; ctx.fillRect(0,0,w,h);

    // Soft center glow
    const rg = ctx.createRadialGradient(w*0.5,h*0.5,0,w*0.5,h*0.5, Math.max(w,h)*0.7);
    rg.addColorStop(0,'rgba(12,28,60,0.9)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0,0,w,h);

    // Neon blobs
    blobs.forEach(b=>{
      b.x+=b.vx*0.0018; b.y+=b.vy*0.0018; if(b.x<0||b.x>1) b.vx*=-1; if(b.y<0||b.y>1) b.vy*=-1;
      const gx=b.x*w, gy=b.y*h, gr=Math.min(w,h)*b.r;
      const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
      g.addColorStop(0,`hsla(${b.hue},95%,60%,0.35)`);
      g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
    });

    // Optional anime.js subtle pulse if available
    if (window.anime) {
      const t = (Date.now()%2000)/2000;
      const pulse = 0.5+0.5*Math.sin(t*Math.PI*2);
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle = `rgba(30,150,255,${0.05*pulse})`;
      ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation='source-over';
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
