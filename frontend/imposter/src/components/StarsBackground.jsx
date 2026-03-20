import React, { useEffect, useRef } from 'react';

const StarsBackground = ({
  factor = 0.05,
  speed = 50,
  starColor = '#fff',
  pointerEvents = true,
  isDark = true,
}) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars
    const starCount = Math.max(200, Math.floor((canvas.width * canvas.height) * 0.0001));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 1.5,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    // Mouse movement tracking
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Draw loop
    const draw = () => {
      ctx.fillStyle = isDark ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = starColor;

      stars.forEach((star) => {
        // Simple movement
        star.x += star.vx * 0.3;
        star.y += star.vy * 0.3;

        // Wrap around edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Mouse repel effect
        if (pointerEvents) {
          const dx = star.x - mouseRef.current.x;
          const dy = star.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const angle = Math.atan2(dy, dx);
            star.vx = Math.cos(angle) * 2;
            star.vy = Math.sin(angle) * 2;
          }
        }

        // Draw star
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [starColor, pointerEvents, isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none',
        background: isDark ? '#000000' : '#ffffff',
      }}
    />
  );
};

export default StarsBackground;
