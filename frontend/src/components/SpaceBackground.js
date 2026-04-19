import React, { useEffect, useRef } from "react";

/**
 * SpaceBackground — Full-screen animated canvas space scene.
 * Renders: twinkling stars, shooting stars, nebula color washes, orbiting dust rings.
 * Attached as a fixed backdrop behind the entire app.
 */
const SpaceBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let raf;
    let W, H;

    // ── Resize handler ──────────────────────────────────────────────────────
    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Stars ───────────────────────────────────────────────────────────────
    const STAR_COUNT = 280;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x:      Math.random(),
      y:      Math.random(),
      r:      Math.random() * 1.6 + 0.2,
      alpha:  Math.random(),
      dAlpha: (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
      hue:    Math.random() < 0.15
                ? `hsl(${180 + Math.random() * 60},80%,80%)`   // cyan-blue stars
                : Math.random() < 0.1
                  ? `hsl(${280 + Math.random() * 40},80%,85%)` // purple stars
                  : "#ffffff",
    }));

    // ── Nebula blobs (static, drawn once behind) ─────────────────────────────
    const nebulae = [
      { x: 0.15, y: 0.25, r: 0.38, c: "rgba(99,60,180,0.13)" },
      { x: 0.75, y: 0.15, r: 0.32, c: "rgba(6,182,212,0.09)"  },
      { x: 0.55, y: 0.75, r: 0.42, c: "rgba(168,60,220,0.10)" },
      { x: 0.88, y: 0.60, r: 0.28, c: "rgba(30,100,255,0.07)" },
    ];

    // ── Shooting stars ──────────────────────────────────────────────────────
    let shooters = [];
    const spawnShooter = () => ({
      x:     Math.random() * W,
      y:     Math.random() * H * 0.5,
      vx:    (Math.random() * 4 + 3),
      vy:    (Math.random() * 2 + 1),
      len:   Math.random() * 90 + 60,
      alpha: 1,
      life:  0,
      maxLife: 60 + Math.random() * 40,
    });

    let shooterTimer = 0;

    // ── Dust particles ──────────────────────────────────────────────────────
    const DUST = 55;
    const dust = Array.from({ length: DUST }, () => ({
      x:   Math.random(),
      y:   Math.random(),
      r:   Math.random() * 1.0 + 0.2,
      vx:  (Math.random() - 0.5) * 0.00012,
      vy:  (Math.random() - 0.5) * 0.00008,
      alpha: Math.random() * 0.4 + 0.1,
      hue:  `hsl(${220 + Math.random() * 100},60%,70%)`,
    }));

    // ── Render loop ──────────────────────────────────────────────────────────
    const draw = () => {
      // Deep space background
      ctx.fillStyle = "#01020a";
      ctx.fillRect(0, 0, W, H);

      // Nebulae
      nebulae.forEach(n => {
        const grd = ctx.createRadialGradient(n.x*W, n.y*H, 0, n.x*W, n.y*H, n.r*Math.max(W,H));
        grd.addColorStop(0, n.c);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      });

      // Stars (twinkle)
      stars.forEach(s => {
        s.alpha += s.dAlpha;
        if (s.alpha > 1 || s.alpha < 0.05) s.dAlpha *= -1;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.hue;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Dust particles
      dust.forEach(d => {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.hue;
        ctx.globalAlpha = d.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Shooting stars
      shooterTimer++;
      if (shooterTimer > 90 + Math.random() * 120) {
        shooters.push(spawnShooter());
        shooterTimer = 0;
      }
      shooters = shooters.filter(s => s.life < s.maxLife);
      shooters.forEach(s => {
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        const progress = s.life / s.maxLife;
        s.alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        const tailX = s.x - s.vx * (s.len / s.vx);
        const tailY = s.y - s.vy * (s.len / s.vx);
        const grd   = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grd.addColorStop(0, "transparent");
        grd.addColorStop(1, `rgba(180,180,255,${s.alpha})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grd;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        // Head glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,255,${s.alpha})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
};

export default SpaceBackground;
