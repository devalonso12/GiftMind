'use client';

import React, { useEffect, useRef } from 'react';

export function SolarSystemBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let w = 0, h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // Stars
    const STAR_COUNT = 600;
    const stars: { x: number; y: number; r: number; twinkleSpeed: number; twinkleOffset: number; color: string }[] = [];
    const starColors = ['#ffffff', '#fff8e1', '#e8eaff', '#ffe4c4', '#c8d8ff'];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }

    // Shooting stars
    const shootingStars: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
    const maybeSpawnShootingStar = () => {
      if (Math.random() < 0.003 && shootingStars.length < 3) {
        const angle = Math.random() * 0.5 + 0.3;
        const speed = Math.random() * 6 + 4;
        shootingStars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: Math.random() * 40 + 30,
        });
      }
    };

    // Planets
    const planets = [
      { name: 'mercury', dist: 55, size: 3, speed: 0.008, color: '#b5b5b5', glowColor: 'rgba(181,181,181,0.3)' },
      { name: 'venus', dist: 80, size: 5, speed: 0.006, color: '#e8c06a', glowColor: 'rgba(232,192,106,0.3)' },
      { name: 'earth', dist: 110, size: 6, speed: 0.005, color: '#4a90d9', glowColor: 'rgba(74,144,217,0.3)', hasMoon: true },
      { name: 'mars', dist: 145, size: 4.5, speed: 0.004, color: '#c1440e', glowColor: 'rgba(193,68,14,0.3)' },
      { name: 'jupiter', dist: 200, size: 14, speed: 0.002, color: '#c88b3a', glowColor: 'rgba(200,139,58,0.2)' },
      { name: 'saturn', dist: 260, size: 11, speed: 0.0015, color: '#e0c068', glowColor: 'rgba(224,192,104,0.2)', hasRing: true },
      { name: 'uranus', dist: 310, size: 8, speed: 0.001, color: '#73c2d0', glowColor: 'rgba(115,194,208,0.15)' },
      { name: 'neptune', dist: 350, size: 7.5, speed: 0.0008, color: '#3f54ba', glowColor: 'rgba(63,84,186,0.15)' },
    ];

    // Asteroid belt
    const asteroids: { dist: number; angle: number; speed: number; size: number }[] = [];
    for (let i = 0; i < 120; i++) {
      asteroids.push({
        dist: 170 + Math.random() * 20,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.001 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 0.3,
      });
    }

    let time = 0;

    const draw = () => {
      time++;
      ctx.fillStyle = '#06050d';
      ctx.fillRect(0, 0, w, h);

      // Nebula clouds
      const drawNebula = (cx: number, cy: number, r: number, color: string) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      drawNebula(w * 0.15, h * 0.3, 300, 'rgba(139,92,246,0.04)');
      drawNebula(w * 0.85, h * 0.6, 250, 'rgba(6,182,212,0.03)');
      drawNebula(w * 0.5, h * 0.8, 350, 'rgba(251,191,36,0.025)');

      // Stars
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
        const alpha = 0.3 + twinkle * 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Shooting stars
      maybeSpawnShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const alpha = 1 - s.life / s.maxLife;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (s.life >= s.maxLife) shootingStars.splice(i, 1);
      }

      // Center of solar system - slightly left and down
      const cx = w * 0.35;
      const cy = h * 0.5;

      // Sun glow
      const sunR = 22;
      const drawSunGlow = (radius: number, alpha: number) => {
        const grad = ctx.createRadialGradient(cx, cy, sunR * 0.5, cx, cy, radius);
        grad.addColorStop(0, `rgba(251,191,36,${alpha})`);
        grad.addColorStop(0.5, `rgba(249,115,22,${alpha * 0.4})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      };
      drawSunGlow(sunR * 8, 0.06);
      drawSunGlow(sunR * 4, 0.12);
      drawSunGlow(sunR * 2, 0.25);

      // Sun body
      const sunGrad = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, sunR);
      sunGrad.addColorStop(0, '#fff8e1');
      sunGrad.addColorStop(0.3, '#fbbf24');
      sunGrad.addColorStop(0.7, '#f59e0b');
      sunGrad.addColorStop(1, '#d97706');
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // Sun corona rays
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.001);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const rayLen = sunR * (1.3 + Math.sin(time * 0.03 + i) * 0.3);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * sunR, Math.sin(angle) * sunR);
        ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
        ctx.strokeStyle = `rgba(251,191,36,${0.2 + Math.sin(time * 0.02 + i) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      // Orbit paths
      for (const planet of planets) {
        ctx.beginPath();
        ctx.arc(cx, cy, planet.dist, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Asteroid belt
      for (const ast of asteroids) {
        ast.angle += ast.speed;
        const ax = cx + Math.cos(ast.angle) * ast.dist;
        const ay = cy + Math.sin(ast.angle) * ast.dist * 0.4; // elliptical
        ctx.beginPath();
        ctx.arc(ax, ay, ast.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180,170,150,0.25)';
        ctx.fill();
      }

      // Planets
      for (const planet of planets) {
        const angle = time * planet.speed;
        const px = cx + Math.cos(angle) * planet.dist;
        const py = cy + Math.sin(angle) * planet.dist * 0.4; // elliptical for 3D perspective

        // Planet glow
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, planet.size * 3);
        glowGrad.addColorStop(0, planet.glowColor);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, planet.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        const pGrad = ctx.createRadialGradient(px - planet.size * 0.3, py - planet.size * 0.3, 0, px, py, planet.size);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.3, planet.color);
        pGrad.addColorStop(1, darkenColor(planet.color, 0.4));
        ctx.beginPath();
        ctx.arc(px, py, planet.size, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();

        // Saturn ring
        if (planet.hasRing) {
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(1, 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, planet.size * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(224,192,104,0.4)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, planet.size * 2.1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(224,192,104,0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Earth moon
        if (planet.hasMoon) {
          const moonAngle = time * 0.02;
          const moonDist = planet.size * 2.5;
          const mx = px + Math.cos(moonAngle) * moonDist;
          const my = py + Math.sin(moonAngle) * moonDist * 0.6;
          ctx.beginPath();
          ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = '#c0c0c0';
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}
