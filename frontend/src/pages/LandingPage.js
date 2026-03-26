import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, Shield, Zap, Eye, ArrowRight, CheckCircle, Github, ChevronDown } from 'lucide-react';
import styles from './LandingPage.module.css';

const features = [
  { icon: ScanLine, title: 'AI-Powered Detection', desc: 'Advanced computer vision algorithms detect and extract license plate numbers with high accuracy.' },
  { icon: Zap, title: 'Real-time Processing', desc: 'Instant plate detection with live WebSocket progress updates and lightning-fast processing pipeline.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'JWT auth, rate limiting, data encryption, and OWASP-compliant security across all endpoints.' },
  { icon: Eye, title: 'Image Enhancement', desc: 'Advanced preprocessing: noise reduction, contrast enhancement, morphological operations, and binarization.' },
];

const stats = [
  { value: '99.2%', label: 'Detection Accuracy' },
  { value: '<800ms', label: 'Avg Process Time' },
  { value: '50+', label: 'Countries Supported' },
  { value: '10M+', label: 'Plates Detected' },
];

export default function LandingPage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,136,${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,255,136,${0.08 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.navLogo}><ScanLine size={16} /></div>
          <span>PlateDetect <span className={styles.aiTag}>AI</span></span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#stats">Stats</a>
          <Link to="/login" className={styles.navLogin}>Login</Link>
          <Link to="/register" className="btn btn-primary">Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          <span>AI-Powered Vehicle Intelligence Platform</span>
        </div>

        <h1 className={styles.heroTitle}>
          Detect Any<br />
          <span className={styles.heroAccent}>License Plate</span><br />
          Instantly
        </h1>

        <p className={styles.heroDesc}>
          Advanced computer vision and OCR technology for real-time vehicle number
          plate detection, image enhancement, and fleet intelligence.
        </p>

        <div className={styles.heroCta}>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
            Start Detecting Free <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: 16, padding: '14px 32px' }}>
            Sign In
          </Link>
        </div>

        {/* Demo plate */}
        <div className={styles.plateDemo}>
          <div className={styles.plateDemoLabel}>
            <div className={styles.scanLine} />
            <span>SCANNING...</span>
          </div>
          <div className={styles.plateCard}>
            <div className={styles.plateStrip} />
            <span className={styles.plateText}>MH 12 AB 3456</span>
            <div className={styles.plateConfidence}>
              <CheckCircle size={12} /> 94.7% confidence
            </div>
          </div>
          <div className={styles.plateInfo}>
            <span>Maharashtra, India</span>
            <span className="badge badge-success">Valid</span>
          </div>
        </div>

        <a href="#features" className={styles.scrollDown}>
          <ChevronDown size={20} />
        </a>
      </section>

      {/* Stats */}
      <section id="stats" className={styles.statsSection}>
        {stats.map(({ value, label }) => (
          <div key={label} className={styles.statItem}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Everything you need</h2>
          <p>Comprehensive plate detection with enterprise-grade features</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2>Ready to detect?</h2>
        <p>Start with 50 free detections. No credit card required.</p>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
          Create Free Account <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <ScanLine size={14} /> PlateDetect AI
        </div>
        <p>© 2024 PlateDetect AI. All rights reserved.</p>
        <div className={styles.footerLinks}>
          <button onClick={() => {}} className={styles.footerLinkBtn}>Privacy</button>
          <button onClick={() => {}} className={styles.footerLinkBtn}>Terms</button>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"><Github size={14} /> GitHub</a>
        </div>
      </footer>
    </div>
  );
}
