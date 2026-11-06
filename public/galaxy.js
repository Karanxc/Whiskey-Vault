/**
 * Whiskey Vault - Liquid Amber & Spirit Embers Canvas
 * Simulates gentle rising golden whiskey vapors, barrel embers, and glowing distillery particles.
 */
class GalaxyBackground {
    constructor() {
        this.canvas = document.getElementById('galaxy-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.amberClouds = [];
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.isMouseMoving = false;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.createParticles();
        this.createAmberClouds();
        this.bindEvents();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        const numParticles = Math.floor((this.canvas.width * this.canvas.height) / 4500);
        this.particles = [];
        
        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2.2 + 0.6,
                speedY: -(Math.random() * 0.45 + 0.15), // Slow rising vapor
                speedX: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.7 + 0.2,
                fadeSpeed: Math.random() * 0.008 + 0.002,
                pulseDirection: 1,
                // Rich whiskey shades: gold, amber, honey, caramel
                hue: Math.random() > 0.6 ? 38 + Math.random() * 8 : 45 + Math.random() * 10
            });
        }
    }

    createAmberClouds() {
        const numClouds = 4;
        this.amberClouds = [];
        
        for (let i = 0; i < numClouds; i++) {
            this.amberClouds.push({
                x: (i / numClouds) * this.canvas.width + Math.random() * 200,
                y: (i % 2 === 0 ? 0.3 : 0.7) * this.canvas.height,
                radius: Math.random() * 220 + 160,
                opacity: Math.random() * 0.05 + 0.03,
                hue: 35 + Math.random() * 15
            });
        }
    }
    
    bindEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
            this.createAmberClouds();
        });
        
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.isMouseMoving = true;
            clearTimeout(this.mouseTimeout);
            this.mouseTimeout = setTimeout(() => {
                this.isMouseMoving = false;
            }, 100);
        });
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw soft warm ambient cellar glow
        this.drawAmbientGlow();
        
        // Update and draw spirit particles
        this.drawParticles();
        
        requestAnimationFrame(() => this.animate());
    }

    drawAmbientGlow() {
        for (let cloud of this.amberClouds) {
            const gradient = this.ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.radius
            );
            gradient.addColorStop(0, `hsla(${cloud.hue}, 85%, 55%, ${cloud.opacity})`);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawParticles() {
        for (let p of this.particles) {
            // Rising vapor animation
            p.y += p.speedY;
            p.x += p.speedX;
            
            // Interactive mouse repelling wave
            const dx = this.mouse.x - p.x;
            const dy = this.mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                const force = (120 - dist) / 120;
                p.x -= (dx / dist) * force * 1.5;
                p.y -= (dy / dist) * force * 1.5;
            }
            
            // Loop particles from bottom when rising off top
            if (p.y < -10) {
                p.y = this.canvas.height + 10;
                p.x = Math.random() * this.canvas.width;
            }
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;
            
            // Pulse opacity
            p.opacity += p.fadeSpeed * p.pulseDirection;
            if (p.opacity > 0.85) {
                p.pulseDirection = -1;
            } else if (p.opacity < 0.2) {
                p.pulseDirection = 1;
            }
            
            // Draw particle with warm amber/gold glow
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.opacity})`;
            this.ctx.shadowBlur = p.size * 3;
            this.ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, 0.6)`;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset shadow
        }
    }
}

// Auto-initialize background on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('galaxy-canvas')) {
        new GalaxyBackground();
    }
});
