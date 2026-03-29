import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE = path.join(ROOT, "store");

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  // --- 1. 메인 기능 스크린샷: 텍스트 선택 + 툴팁 ---
  const mainPage = await context.newPage();
  await mainPage.setContent(getMainHTML(), { waitUntil: "networkidle" });
  await mainPage.waitForTimeout(300);
  await mainPage.screenshot({ path: path.join(STORE, "screenshot-1-main.png") });
  console.log("✓ screenshot-1-main.png");

  // --- 2. 상세 설명 스크린샷: More 클릭 후 ---
  const detailPage = await context.newPage();
  await detailPage.setContent(getDetailHTML(), { waitUntil: "networkidle" });
  await detailPage.waitForTimeout(300);
  await detailPage.screenshot({ path: path.join(STORE, "screenshot-2-detail.png") });
  console.log("✓ screenshot-2-detail.png");

  // --- 3. 설정 화면 스크린샷 ---
  const settingsPage = await context.newPage();
  await settingsPage.setContent(getSettingsHTML(), { waitUntil: "networkidle" });
  await settingsPage.waitForTimeout(300);
  await settingsPage.screenshot({ path: path.join(STORE, "screenshot-3-settings.png") });
  console.log("✓ screenshot-3-settings.png");

  // --- 4. Small promo tile (440x280) ---
  const smallCtx = await browser.newContext({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  const smallPage = await smallCtx.newPage();
  await smallPage.setContent(getSmallPromoHTML(), { waitUntil: "networkidle" });
  await smallPage.waitForTimeout(300);
  await smallPage.screenshot({ path: path.join(STORE, "promo-small-440x280.png") });
  console.log("✓ promo-small-440x280.png");

  // --- 5. Marquee promo tile (1400x560) ---
  const marqueeCtx = await browser.newContext({ viewport: { width: 1400, height: 560 }, deviceScaleFactor: 1 });
  const marqueePage = await marqueeCtx.newPage();
  await marqueePage.setContent(getMarqueePromoHTML(), { waitUntil: "networkidle" });
  await marqueePage.waitForTimeout(300);
  await marqueePage.screenshot({ path: path.join(STORE, "promo-marquee-1400x560.png") });
  console.log("✓ promo-marquee-1400x560.png");

  await browser.close();
  console.log("\n모든 스크린샷 촬영 완료 → store/");
}

function getMainHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f8f9fa;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: #333;
  }
  .page {
    background: #fff;
    width: 900px;
    border-radius: 12px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
    padding: 48px 56px;
    position: relative;
  }
  .url-bar {
    background: #f1f3f4;
    border-radius: 24px;
    padding: 10px 20px;
    margin-bottom: 32px;
    font-size: 14px;
    color: #5f6368;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .url-bar .lock { color: #188038; }
  h1 { font-size: 22px; margin-bottom: 16px; color: #1a1a1a; }
  p { font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 12px; }
  mark {
    background: #fef08a;
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }
  .tooltip {
    position: absolute;
    top: 200px;
    left: 380px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    padding: 14px 16px;
    max-width: 400px;
    min-width: 260px;
    animation: fadeIn 0.3s ease-out;
    z-index: 10;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .one-liner { font-size: 14px; color: #1a1a1a; margin-bottom: 10px; line-height: 1.5; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .btn-more {
    padding: 5px 12px;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    background: #f0f7ff;
    color: #2563eb;
    cursor: pointer;
  }
  .ai-trigger {
    background: #1a1a1a;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 10px;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }
  .ai-trigger svg { width: 14px; height: 14px; fill: currentColor; }
  .citations { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
  .citations a {
    display: block; font-size: 11px; color: #2563eb;
    text-decoration: none; padding: 3px 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .citations a::before { content: "🔗 "; }
</style>
</head>
<body>
  <div class="page">
    <div class="url-bar">
      <span class="lock">🔒</span> developer.mozilla.org/ko/docs/Web/API/Service_Worker_API
    </div>
    <h1>Service Worker API</h1>
    <p>
      Service Worker는 웹 애플리케이션, 브라우저, 그리고 네트워크 사이의
      프록시 서버 역할을 합니다. <mark>Service Worker</mark>는 출처와 경로에 대해
      등록하는 이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
    </p>
    <p>
      연관된 웹 페이지를 제어하여 네트워크 요청을 가로채고 수정하며,
      리소스를 세밀하게 캐싱할 수 있습니다. 이를 통해 오프라인에서도
      웹 앱이 올바르게 동작하도록 할 수 있습니다.
    </p>

    <div class="tooltip">
      <div class="one-liner">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱·푸시 알림 등을 처리하는 프록시 역할의 워커이다.</div>
      <div class="citations">
        <a href="#">developer.mozilla.org — Service Worker API</a>
        <a href="#">web.dev — Service workers overview</a>
      </div>
      <div class="actions">
        <button class="btn-more">More</button>
        <button class="ai-trigger">
          <svg viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z"/></svg>
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getDetailHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f8f9fa;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: #333;
  }
  .page {
    background: #fff;
    width: 900px;
    border-radius: 12px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
    padding: 48px 56px;
    position: relative;
  }
  .url-bar {
    background: #f1f3f4;
    border-radius: 24px;
    padding: 10px 20px;
    margin-bottom: 32px;
    font-size: 14px;
    color: #5f6368;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .url-bar .lock { color: #188038; }
  h1 { font-size: 22px; margin-bottom: 16px; color: #1a1a1a; }
  p { font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 12px; }
  mark {
    background: #fef08a;
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }
  .tooltip {
    position: absolute;
    top: 185px;
    left: 340px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    padding: 14px 16px;
    max-width: 420px;
    min-width: 280px;
    z-index: 10;
  }
  .one-liner { font-size: 14px; color: #1a1a1a; margin-bottom: 10px; line-height: 1.5; }
  .detailed {
    font-size: 13px; color: #444; margin-bottom: 10px;
    padding-top: 10px; border-top: 1px solid #f0f0f0;
    white-space: pre-wrap; line-height: 1.6;
  }
  .actions { display: flex; gap: 8px; align-items: center; }
  .ai-trigger {
    background: #1a1a1a; color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    height: 28px; padding: 0 10px;
    border: none; border-radius: 20px;
    font-size: 12px; font-weight: 600;
  }
  .ai-trigger svg { width: 14px; height: 14px; fill: currentColor; }
  .citations { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
  .citations a {
    display: block; font-size: 11px; color: #2563eb;
    text-decoration: none; padding: 3px 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .citations a::before { content: "🔗 "; }
</style>
</head>
<body>
  <div class="page">
    <div class="url-bar">
      <span class="lock">🔒</span> developer.mozilla.org/ko/docs/Web/API/Service_Worker_API
    </div>
    <h1>Service Worker API</h1>
    <p>
      Service Worker는 웹 애플리케이션, 브라우저, 그리고 네트워크 사이의
      프록시 서버 역할을 합니다. <mark>Service Worker</mark>는 출처와 경로에 대해
      등록하는 이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
    </p>

    <div class="tooltip">
      <div class="one-liner">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱·푸시 알림 등을 처리하는 프록시 역할의 워커이다.</div>
      <div class="detailed">Service Worker는 브라우저와 네트워크 사이에서 동작하는 프록시 서버이다. 웹 페이지와는 별도의 백그라운드 스레드에서 실행되며, DOM에 직접 접근할 수 없다.

주요 기능으로는 네트워크 요청 가로채기(fetch event), 리소스 캐싱(Cache API), 오프라인 지원, 푸시 알림(Push API), 백그라운드 동기화(Background Sync)가 있다.

HTTPS 환경에서만 등록 가능하며(localhost 제외), 등록 후 install → activate → fetch 순서의 생명주기를 거친다.</div>
      <div class="citations">
        <a href="#">developer.mozilla.org — Service Worker API</a>
        <a href="#">web.dev — Service workers overview</a>
        <a href="#">w3c.github.io — Service Workers Specification</a>
      </div>
      <div class="actions">
        <button class="ai-trigger">
          <svg viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z"/></svg>
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getSettingsHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f8f9fa;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  .popup-frame {
    background: #fff;
    width: 320px;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    overflow: hidden;
  }
  .popup-header {
    background: #f8f9fa;
    padding: 8px 16px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .popup-header .dot { width: 8px; height: 8px; border-radius: 50%; }
  .popup-header .dot-r { background: #ff5f57; }
  .popup-header .dot-y { background: #febc2e; }
  .popup-header .dot-g { background: #28c840; }
  .popup-body {
    padding: 20px;
    font-size: 14px;
    color: #333;
  }
  .popup-body h2 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .popup-body .subtitle {
    font-size: 12px;
    color: #888;
    margin-bottom: 16px;
  }
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: #555;
    margin-bottom: 8px;
  }
  .input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .input-group input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
  }
  .input-group input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
  .btn-save {
    padding: 8px 16px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .api-status {
    font-size: 11px;
    color: #22c55e;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .api-status::before { content: "✓"; font-weight: bold; }
  .trigger-section { margin-top: 4px; }
  .toggle-group {
    display: flex;
    gap: 0;
    margin-bottom: 16px;
  }
  .toggle-btn {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    background: #fff;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.15s;
  }
  .toggle-btn:first-child { border-radius: 8px 0 0 8px; }
  .toggle-btn:last-child { border-radius: 0 8px 8px 0; border-left: none; }
  .toggle-btn.active {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }
  .tip {
    font-size: 11px;
    color: #888;
    background: #f8f9fa;
    padding: 10px 12px;
    border-radius: 8px;
    line-height: 1.5;
  }
  .tip strong { color: #555; }
</style>
</head>
<body>
  <div class="popup-frame">
    <div class="popup-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      AI One-Liner
    </div>
    <div class="popup-body">
      <h2>AI One-Liner</h2>
      <div class="subtitle">텍스트를 선택하면 AI가 한 줄로 설명해줍니다</div>

      <div class="section-label">OpenAI API Key</div>
      <div class="input-group">
        <input type="password" value="sk-proj-abc...xyz" />
        <button class="btn-save">저장</button>
      </div>
      <div class="api-status">sk-p…hXyz 저장됨</div>

      <div class="trigger-section">
        <div class="section-label">트리거 모드</div>
        <div class="toggle-group">
          <button class="toggle-btn active">Auto</button>
          <button class="toggle-btn">Click</button>
        </div>
      </div>

      <div class="tip">
        <strong>💡 Tip:</strong> PDF 뷰어에서는 텍스트를 선택한 뒤 우클릭 → "AI One-Liner" 메뉴를 이용하세요.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getSmallPromoHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 440px; height: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #fff;
  }
  .container {
    text-align: center;
    padding: 0 32px;
  }
  .logo {
    width: 56px; height: 56px;
    background: rgba(255,255,255,0.12);
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin-bottom: 16px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.15);
  }
  h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
  }
  p {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    line-height: 1.5;
  }
  .highlight {
    color: #60a5fa;
    font-weight: 600;
  }
  .pill {
    display: inline-block;
    margin-top: 14px;
    padding: 5px 14px;
    background: rgba(96,165,250,0.15);
    border: 1px solid rgba(96,165,250,0.3);
    border-radius: 20px;
    font-size: 11px;
    color: #93c5fd;
    font-weight: 500;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">AI</div>
    <h1>AI One-Liner</h1>
    <p><span class="highlight">드래그 한 번</span>이면, AI가 한 줄로 설명해줍니다</p>
    <span class="pill">Powered by OpenAI</span>
  </div>
</body>
</html>`;
}

function getMarqueePromoHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1400px; height: 560px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1a1a2e 100%);
    display: flex;
    align-items: center;
    overflow: hidden;
    color: #fff;
  }
  .left {
    flex: 1;
    padding: 0 80px;
  }
  .logo {
    width: 64px; height: 64px;
    background: rgba(255,255,255,0.10);
    border-radius: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 700;
    margin-bottom: 24px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.12);
  }
  h1 {
    font-size: 42px;
    font-weight: 800;
    margin-bottom: 12px;
    letter-spacing: -1px;
    line-height: 1.1;
  }
  .subtitle {
    font-size: 18px;
    color: rgba(255,255,255,0.65);
    margin-bottom: 28px;
    line-height: 1.5;
  }
  .highlight { color: #60a5fa; }
  .features {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .feature {
    padding: 6px 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    font-size: 13px;
    color: rgba(255,255,255,0.75);
  }
  .right {
    width: 560px;
    height: 560px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .mockup {
    background: #fff;
    width: 420px;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    padding: 28px 32px;
    color: #333;
    position: relative;
  }
  .mockup-url {
    background: #f1f3f4;
    border-radius: 16px;
    padding: 7px 14px;
    margin-bottom: 18px;
    font-size: 11px;
    color: #5f6368;
  }
  .mockup h2 { font-size: 15px; margin-bottom: 8px; color: #1a1a1a; }
  .mockup p { font-size: 12px; line-height: 1.7; color: #555; }
  .mockup mark { background: #fef08a; color: inherit; border-radius: 2px; padding: 0 2px; }
  .tooltip-mock {
    position: absolute;
    bottom: -20px;
    right: -30px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 12px 14px;
    width: 280px;
    color: #333;
  }
  .tooltip-mock .t-text { font-size: 12px; line-height: 1.5; color: #1a1a1a; margin-bottom: 8px; }
  .tooltip-mock .t-actions { display: flex; gap: 6px; align-items: center; }
  .tooltip-mock .t-btn {
    padding: 4px 10px;
    border-radius: 14px;
    font-size: 10px;
    font-weight: 600;
    border: none;
  }
  .tooltip-mock .t-more { background: #f0f7ff; color: #2563eb; }
  .tooltip-mock .t-ai { background: #1a1a1a; color: #fff; font-size: 10px; padding: 4px 8px; }
  .glow {
    position: absolute;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="left">
    <div class="logo">AI</div>
    <h1>AI One-Liner</h1>
    <p class="subtitle">
      <span class="highlight">드래그 한 번</span>이면, AI가 한 줄로 설명해줍니다.<br>
      탭 전환 없이, 지금 보는 페이지에서 바로.
    </p>
    <div class="features">
      <span class="feature">한 줄 요약</span>
      <span class="feature">상세 설명</span>
      <span class="feature">출처 링크</span>
      <span class="feature">AI 바로가기</span>
      <span class="feature">PDF 지원</span>
    </div>
  </div>
  <div class="right">
    <div class="glow"></div>
    <div class="mockup">
      <div class="mockup-url">developer.mozilla.org/ko/docs/Web/API</div>
      <h2>Service Worker API</h2>
      <p>
        Service Worker는 웹 애플리케이션과 네트워크 사이의
        프록시 서버 역할을 합니다. <mark>Service Worker</mark>는
        이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
      </p>
      <div class="tooltip-mock">
        <div class="t-text">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱 등을 처리하는 프록시 역할의 워커이다.</div>
        <div class="t-actions">
          <button class="t-btn t-more">More</button>
          <button class="t-btn t-ai">AI</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

main().catch(console.error);
