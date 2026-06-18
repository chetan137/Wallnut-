import React from 'react';
import wallnutHero from '../assets/W.avif';
import logo from '../assets/logo.png';
import './AboutPage.css';

export default function AboutPage() {
  return (
    <div className="about-container" id="about-page">
      <div className="about-header-card">
        <div className="about-header-content">
          <img src={logo} alt="Wallnut Logo" className="about-logo" />
          <h1 className="about-title">About Wallnut</h1>
          <p className="about-subtitle">Building Modern India Through Science-Backed Innovation</p>
        </div>
        <div className="about-hero-wrapper">
          <img src={wallnutHero} alt="Wallnut R&D and Manufacturing" className="about-hero-img" />
          <div className="about-hero-overlay"></div>
        </div>
      </div>

      <div className="about-grid">
        <div className="about-card intro-card">
          <h2>Our Journey &amp; Vision</h2>
          <p className="highlight-text">
            Founded in 2017 by <strong>Hemant Jain</strong>, Wallnut was established with a singular vision: to build modern India through industrialized, science-backed building material innovation.
          </p>
          <p>
            Through rigorous in-house research, engineering excellence, and a full spectrum of advanced manufacturing technologies, Wallnut has quickly become India's most trusted name in tile and stone fixing products.
          </p>
        </div>

        <div className="about-card highlight-metric-card">
          <div className="metric-box">
            <span className="metric-val">2017</span>
            <span className="metric-lbl">Founded</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">2</span>
            <span className="metric-lbl">Factories</span>
          </div>
          <div className="metric-box">
            <span className="metric-val">100%</span>
            <span className="metric-lbl">Quality Control</span>
          </div>
        </div>

        <div className="about-card feature-card">
          <div className="feature-icon">🔬</div>
          <div className="feature-info">
            <h3>In-House R&amp;D Center, Mumbai</h3>
            <p>
              Our proprietary formulations are fully compliant with EN, ANSI, and BIS international standards. Every batch is rigorously tested at our Mumbai facility before release.
            </p>
          </div>
        </div>

        <div className="about-card feature-card">
          <div className="feature-icon">🏭</div>
          <div className="feature-info">
            <h3>State-of-the-Art Factories</h3>
            <p>
              With advanced, fully automated manufacturing units operating in <strong>Vadodara (Gujarat)</strong> and <strong>Kolhapur (Maharashtra)</strong>, we ensure premium quality, high-volume production, and seamless regional distribution.
            </p>
          </div>
        </div>

        <div className="about-card feature-card">
          <div className="feature-icon">🌱</div>
          <div className="feature-info">
            <h3>Sustainability Commitment</h3>
            <p>
              Wallnut is committed to eco-friendly practices. We produce low-VOC, green-certified products designed to reduce environmental impact across their full lifecycle.
            </p>
          </div>
        </div>

        <div className="about-card feature-card">
          <div className="feature-icon">🎓</div>
          <div className="feature-info">
            <h3>Wallnut Academy &amp; P.I.P</h3>
            <p>
              We run free technical training programs, app-based rewards (Preferred Installer Program), and dedicated support for contractors, builders, and trade partners across India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
