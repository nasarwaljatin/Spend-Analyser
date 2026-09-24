const express = require('express');
const https = require('https');

const router = express.Router();

// GitHub repo details — update if you fork/rename the repo
const GITHUB_OWNER = 'nasarwaljatin';
const GITHUB_REPO = 'Spend-Analyser';
const RELEASE_TAG = 'apk-latest';
const APK_ASSET_NAME = 'SpendWise.apk';

// Direct GitHub Releases download URL (permanent once the release tag exists)
const GITHUB_APK_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${APK_ASSET_NAME}`;
const GITHUB_API_RELEASE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`;

/**
 * GET /api/download/apk
 * Redirects the browser to the GitHub Release APK download URL.
 * The APK is built automatically by GitHub Actions on every push to main.
 */
router.get('/apk', (req, res) => {
  // 302 redirect to GitHub Releases — browser will download SpendWise.apk directly
  res.redirect(302, GITHUB_APK_URL);
});

/**
 * GET /api/download/info
 * Returns metadata about the latest APK release from GitHub.
 */
router.get('/info', (req, res) => {
  // Fetch release info from GitHub API
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`,
    headers: {
      'User-Agent': 'SpendWise-Server',
      Accept: 'application/vnd.github+json',
    },
  };

  const apiReq = https.get(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const release = JSON.parse(data);

        // Find the APK asset
        const apkAsset = (release.assets || []).find(
          (a) => a.name === APK_ASSET_NAME
        );

        const available = !!apkAsset;
        const fileSizeMb = apkAsset
          ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10
          : null;

        res.json({
          name: 'SpendWise',
          version: '1.0.0',
          available,
          fileSizeMb,
          minAndroidVersion: 'Android 7.0 (API 24)',
          downloadUrl: '/api/download/apk',
          directUrl: available ? apkAsset.browser_download_url : null,
          publishedAt: release.published_at || null,
          releaseNotes: [
            'Full spend analyser dashboard',
            'Transaction tracking with categories',
            'Budget management and alerts',
            'Monthly & yearly reports with charts',
            'Recurring transaction management',
            'Dark glassmorphism theme',
          ],
        });
      } catch {
        // GitHub API failed — return fallback info
        res.json({
          name: 'SpendWise',
          version: '1.0.0',
          available: false,
          fileSizeMb: null,
          minAndroidVersion: 'Android 7.0 (API 24)',
          downloadUrl: '/api/download/apk',
          directUrl: null,
          publishedAt: null,
          releaseNotes: [],
        });
      }
    });
  });

  apiReq.on('error', () => {
    res.json({
      name: 'SpendWise',
      version: '1.0.0',
      available: false,
      fileSizeMb: null,
      minAndroidVersion: 'Android 7.0 (API 24)',
      downloadUrl: '/api/download/apk',
      directUrl: null,
      publishedAt: null,
      releaseNotes: [],
    });
  });

  apiReq.setTimeout(5000, () => {
    apiReq.destroy();
    res.json({
      name: 'SpendWise',
      version: '1.0.0',
      available: false,
      fileSizeMb: null,
      minAndroidVersion: 'Android 7.0 (API 24)',
      downloadUrl: '/api/download/apk',
      directUrl: null,
      publishedAt: null,
      releaseNotes: [],
    });
  });
});

module.exports = router;
