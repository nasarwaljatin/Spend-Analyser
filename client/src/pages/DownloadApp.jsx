import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IoLogoAndroid, IoDownloadOutline, IoCheckmarkCircleOutline,
  IoPhonePortraitOutline, IoShieldCheckmarkOutline, IoSparklesOutline,
  IoTimeOutline, IoCloudDownloadOutline,
} from 'react-icons/io5';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const APK_DOWNLOAD_URL = `${API_BASE}/download/apk`;
const APK_INFO_URL = `${API_BASE}/download/info`;

const features = [
  { icon: '📊', label: 'Beautiful Charts', desc: 'Visualize your spending with interactive charts' },
  { icon: '💰', label: 'Budget Tracking', desc: 'Set and monitor budgets across categories' },
  { icon: '🔄', label: 'Recurring Bills', desc: 'Never miss a recurring payment or subscription' },
  { icon: '📑', label: 'Smart Reports', desc: 'Monthly and yearly financial reports' },
  { icon: '🌙', label: 'Dark Mode', desc: 'Premium dark glassmorphism theme' },
  { icon: '🔒', label: 'Secure & Private', desc: 'JWT auth, encrypted data, no tracking' },
];

const steps = [
  { step: '1', title: 'Download APK', desc: 'Tap the download button to get the SpendWise.apk file to your phone.' },
  { step: '2', title: 'Allow Unknown Sources', desc: 'Settings → Security → Enable "Install unknown apps" for your browser.' },
  { step: '3', title: 'Open & Install', desc: 'Open the downloaded file and tap "Install". App appears on home screen!' },
];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DownloadApp() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);

  // Fetch live APK info from the backend
  useEffect(() => {
    fetch(APK_INFO_URL)
      .then((r) => r.json())
      .then((data) => {
        setApkInfo(data);
        setInfoLoading(false);
      })
      .catch(() => {
        setApkInfo({ available: false });
        setInfoLoading(false);
      });
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    // Navigate directly — server does a 302 redirect to GitHub Releases
    window.location.href = APK_DOWNLOAD_URL;
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    }, 2000);
  };

  const apkAvailable = apkInfo?.available ?? false;
  const fileSizeMb = apkInfo?.fileSizeMb;
  const publishedAt = apkInfo?.publishedAt;

  return (
    <div className="download-page">
      {/* Animated background blobs */}
      <div className="download-bg-blob download-bg-blob-1" />
      <div className="download-bg-blob download-bg-blob-2" />

      {/* Header nav */}
      <nav className="download-nav">
        <div className="download-nav-logo">
          <span style={{ fontSize: '1.5rem' }}>💰</span>
          <span>SpendWise</span>
        </div>
        <Link to="/login" className="btn btn-outline download-nav-btn">
          Sign In →
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="download-hero">
        <div className="download-hero-badge">
          <IoLogoAndroid size={14} />
          <span>Android App · Auto-built via GitHub Actions</span>
        </div>

        <h1 className="download-hero-title">
          Your Finances,
          <br />
          <span className="download-hero-gradient">In Your Pocket</span>
        </h1>

        <p className="download-hero-subtitle">
          The full SpendWise experience as a native Android app.
          Track expenses, manage budgets, and view reports — all in one app.
        </p>

        {/* APK Download Card */}
        <div className="download-apk-card">
          <div className="download-apk-icon">
            <img src="/icon-512.jpg" alt="SpendWise App Icon" />
          </div>

          <div className="download-apk-info">
            <div className="download-apk-name">SpendWise</div>
            <div className="download-apk-meta">
              {infoLoading ? (
                <span style={{ opacity: 0.5 }}>Loading info...</span>
              ) : (
                <>
                  <span>Android 7.0+</span>
                  {fileSizeMb && (
                    <><span className="download-apk-dot">·</span><span>{fileSizeMb} MB</span></>
                  )}
                  {publishedAt && (
                    <><span className="download-apk-dot">·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <IoTimeOutline size={12} />
                      {formatDate(publishedAt)}
                    </span></>
                  )}
                </>
              )}
            </div>
            <div className="download-apk-badge-row">
              {apkAvailable ? (
                <>
                  <span className="download-apk-badge">
                    <IoShieldCheckmarkOutline size={12} /> Safe &amp; Verified
                  </span>
                  <span className="download-apk-badge">
                    <IoSparklesOutline size={12} /> No Ads
                  </span>
                </>
              ) : (
                <span className="download-apk-badge download-apk-badge-pending">
                  <IoCloudDownloadOutline size={12} /> Build in progress...
                </span>
              )}
            </div>
          </div>

          <button
            id="download-apk-btn"
            className={`btn download-apk-btn ${downloaded ? 'download-apk-btn-success' : ''} ${!apkAvailable && !infoLoading ? 'download-apk-btn-unavailable' : ''}`}
            onClick={handleDownload}
            disabled={downloading || infoLoading}
            title={!apkAvailable && !infoLoading ? 'APK is being built — try again in a few minutes' : 'Download SpendWise APK'}
          >
            {downloaded ? (
              <><IoCheckmarkCircleOutline size={20} />Downloaded!</>
            ) : downloading ? (
              <><span className="download-spinner" />Starting...</>
            ) : (
              <><IoDownloadOutline size={20} />Download APK</>
            )}
          </button>
        </div>

        <p className="download-apk-note">
          <IoPhonePortraitOutline size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Free forever · No Play Store required · Built automatically on every update
        </p>
      </section>

      {/* Features Grid */}
      <section className="download-features">
        <h2 className="download-section-title">Everything you need to manage money</h2>
        <div className="download-features-grid">
          {features.map((f) => (
            <div key={f.label} className="download-feature-card">
              <div className="download-feature-icon">{f.icon}</div>
              <div className="download-feature-label">{f.label}</div>
              <div className="download-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Install Steps */}
      <section className="download-steps">
        <h2 className="download-section-title">How to install</h2>
        <div className="download-steps-grid">
          {steps.map((s) => (
            <div key={s.step} className="download-step-card">
              <div className="download-step-number">{s.step}</div>
              <div className="download-step-title">{s.title}</div>
              <div className="download-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="download-cta">
        <h2>Prefer the web version?</h2>
        <p>Sign in to use SpendWise right in your browser — no installation needed.</p>
        <div className="download-cta-buttons">
          <Link to="/login" className="btn btn-primary" style={{ minWidth: 160 }}>
            Open Web App
          </Link>
          <button
            className="btn btn-outline"
            onClick={handleDownload}
            disabled={downloading || infoLoading}
            style={{ minWidth: 160 }}
          >
            <IoDownloadOutline size={16} />
            Download APK
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="download-footer">
        <span>© 2026 SpendWise · Auto-built with GitHub Actions + Capacitor.js</span>
        <Link to="/login">Sign In</Link>
        <Link to="/register">Register</Link>
      </footer>
    </div>
  );
}
