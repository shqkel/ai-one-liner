import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE = path.join(ROOT, "store");

const BRAND = {
  primary: "#2563eb",
  dark: "#0f172a",
  darkGrad: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
  accent: "#60a5fa",
  highlight: "#fef08a",
};

async function main() {
  const browser = await chromium.launch();

  // --- 1. 메인 기능: 한 줄 설명 툴팁 ---
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const p1 = await ctx1.newPage();
  await p1.setContent(getMainHTML(), { waitUntil: "networkidle" });
  await p1.waitForTimeout(300);
  await p1.screenshot({ path: path.join(STORE, "screenshot-1-main.png") });
  console.log("✓ screenshot-1-main.png");

  // --- 2. 상세 설명 ---
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const p2 = await ctx2.newPage();
  await p2.setContent(getDetailHTML(), { waitUntil: "networkidle" });
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: path.join(STORE, "screenshot-2-detail.png") });
  console.log("✓ screenshot-2-detail.png");

  // --- 3. 설정 화면 ---
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const p3 = await ctx3.newPage();
  await p3.setContent(getSettingsHTML(), { waitUntil: "networkidle" });
  await p3.waitForTimeout(300);
  await p3.screenshot({ path: path.join(STORE, "screenshot-3-settings.png") });
  console.log("✓ screenshot-3-settings.png");

  // --- 4. Small promo tile (440x280) ---
  const ctx4 = await browser.newContext({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  const p4 = await ctx4.newPage();
  await p4.setContent(getSmallPromoHTML(), { waitUntil: "networkidle" });
  await p4.waitForTimeout(300);
  await p4.screenshot({ path: path.join(STORE, "promo-small-440x280.png") });
  console.log("✓ promo-small-440x280.png");

  // --- 5. Marquee promo tile (1400x560) ---
  const ctx5 = await browser.newContext({ viewport: { width: 1400, height: 560 }, deviceScaleFactor: 1 });
  const p5 = await ctx5.newPage();
  await p5.setContent(getMarqueePromoHTML(), { waitUntil: "networkidle" });
  await p5.waitForTimeout(300);
  await p5.screenshot({ path: path.join(STORE, "promo-marquee-1400x560.png") });
  console.log("✓ promo-marquee-1400x560.png");

  await browser.close();
  console.log("\n모든 이미지 생성 완료 → store/");
}

/* ─── 공통 브라우저 크롬 스타일 ─── */
const CHROME_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #dee1e6;
    overflow: hidden;
  }
  .browser {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .tab-bar {
    background: #dee1e6;
    padding: 8px 12px 0;
    display: flex;
    align-items: flex-end;
    gap: 0;
  }
  .tab {
    background: #fff;
    padding: 8px 20px;
    border-radius: 8px 8px 0 0;
    font-size: 12px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 200px;
  }
  .tab-icon { width: 14px; height: 14px; border-radius: 2px; background: ${BRAND.primary}; flex-shrink: 0; }
  .tab-inactive {
    background: #d3d6db;
    color: #666;
    padding: 7px 16px;
    font-size: 11px;
  }
  .tab-inactive .tab-icon { background: #aaa; }
  .url-bar-area {
    background: #fff;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .nav-btns {
    display: flex;
    gap: 8px;
    color: #999;
    font-size: 16px;
  }
  .url-input {
    flex: 1;
    background: #f1f3f4;
    border-radius: 20px;
    padding: 7px 16px;
    font-size: 13px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .url-lock { color: #188038; font-size: 12px; }
  .url-text { color: #5f6368; }
  .ext-icons {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .ext-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    background: ${BRAND.primary};
  }
  .ext-icon-gray { background: #bbb; }
  .page-content {
    flex: 1;
    background: #fff;
    overflow: hidden;
    position: relative;
  }
`;

/* ─── 공통 툴팁 스타일 ─── */
const TOOLTIP_STYLE = `
  .tooltip {
    position: absolute;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    padding: 14px 16px;
    max-width: 400px;
    min-width: 260px;
    z-index: 10;
  }
  .one-liner { font-size: 14px; color: #1a1a1a; margin-bottom: 10px; line-height: 1.5; }
  .detailed {
    font-size: 13px; color: #444; margin-bottom: 10px;
    padding-top: 10px; border-top: 1px solid #f0f0f0;
    white-space: pre-wrap; line-height: 1.6;
  }
  .actions { display: flex; gap: 8px; align-items: center; }
  .btn-more {
    padding: 5px 12px; border: none; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    background: #f0f7ff; color: ${BRAND.primary};
  }
  .ai-trigger {
    background: #1a1a1a; color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    height: 28px; padding: 0 10px; border: none; border-radius: 20px;
    font-size: 12px; font-weight: 600;
  }
  .ai-trigger svg { width: 14px; height: 14px; fill: currentColor; }
  .citations { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
  .citations a {
    display: block; font-size: 11px; color: ${BRAND.primary};
    text-decoration: none; padding: 2px 0;
  }
  .citations a::before { content: "🔗 "; }
  mark { background: ${BRAND.highlight}; color: inherit; border-radius: 2px; padding: 0 2px; }
`;

const AI_SVG = `<svg viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z"/></svg>`;

function browserChrome(url, pageContent) {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8">
<style>
  ${CHROME_STYLE}
  ${TOOLTIP_STYLE}
  .article { padding: 48px 80px; max-width: 900px; }
  .article h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 16px; }
  .article p { font-size: 15px; line-height: 1.9; color: #444; margin-bottom: 14px; }
</style>
</head>
<body>
<div class="browser">
  <div class="tab-bar">
    <div class="tab"><div class="tab-icon"></div>Service Worker API</div>
    <div class="tab tab-inactive"><div class="tab-icon tab-icon"></div>GitHub</div>
  </div>
  <div class="url-bar-area">
    <div class="nav-btns">&#8592; &#8594; &#8635;</div>
    <div class="url-input">
      <span class="url-lock">🔒</span>
      <span class="url-text">${url}</span>
    </div>
    <div class="ext-icons">
      <div class="ext-icon">AI</div>
      <div class="ext-icon ext-icon-gray">A</div>
      <div class="ext-icon ext-icon-gray">B</div>
    </div>
  </div>
  <div class="page-content">
    ${pageContent}
  </div>
</div>
</body></html>`;
}

function getMainHTML() {
  return browserChrome("developer.mozilla.org/ko/docs/Web/API/Service_Worker_API", `
    <div class="article">
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
      <p>
        Service Worker의 수명 주기는 웹 페이지와 완전히 별개입니다. 설치(install),
        활성화(activate), 그리고 이벤트 처리의 단계를 거칩니다.
      </p>
    </div>
    <div class="tooltip" style="top: 120px; left: 500px;">
      <div class="one-liner">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱·푸시 알림 등을 처리하는 프록시 역할의 워커이다.</div>
      <div class="citations">
        <a>developer.mozilla.org — Service Worker API</a>
        <a>web.dev — Service workers overview</a>
      </div>
      <div class="actions">
        <button class="btn-more">More</button>
        <button class="ai-trigger">${AI_SVG}</button>
      </div>
    </div>
  `);
}

function getDetailHTML() {
  return browserChrome("developer.mozilla.org/ko/docs/Web/API/Service_Worker_API", `
    <div class="article">
      <h1>Service Worker API</h1>
      <p>
        Service Worker는 웹 애플리케이션, 브라우저, 그리고 네트워크 사이의
        프록시 서버 역할을 합니다. <mark>Service Worker</mark>는 출처와 경로에 대해
        등록하는 이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
      </p>
      <p>
        연관된 웹 페이지를 제어하여 네트워크 요청을 가로채고 수정하며,
        리소스를 세밀하게 캐싱할 수 있습니다.
      </p>
    </div>
    <div class="tooltip" style="top: 110px; left: 460px; max-width: 440px;">
      <div class="one-liner">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱·푸시 알림 등을 처리하는 프록시 역할의 워커이다.</div>
      <div class="detailed">Service Worker는 브라우저와 네트워크 사이에서 동작하는 프록시 서버이다. 웹 페이지와는 별도의 백그라운드 스레드에서 실행되며, DOM에 직접 접근할 수 없다.

주요 기능으로는 네트워크 요청 가로채기(fetch event), 리소스 캐싱(Cache API), 오프라인 지원, 푸시 알림(Push API), 백그라운드 동기화(Background Sync)가 있다.

HTTPS 환경에서만 등록 가능하며(localhost 제외), 등록 후 install → activate → fetch 순서의 생명주기를 거친다.</div>
      <div class="citations">
        <a>developer.mozilla.org — Service Worker API</a>
        <a>web.dev — Service workers overview</a>
        <a>w3c.github.io — Service Workers Specification</a>
      </div>
      <div class="actions">
        <button class="ai-trigger">${AI_SVG}</button>
      </div>
    </div>
  `);
}

function getSettingsHTML() {
  return browserChrome("developer.mozilla.org/ko/docs/Web/API/Service_Worker_API", `
    <div class="article">
      <h1>Service Worker API</h1>
      <p>
        Service Worker는 웹 애플리케이션, 브라우저, 그리고 네트워크 사이의
        프록시 서버 역할을 합니다. Service Worker는 출처와 경로에 대해
        등록하는 이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
      </p>
      <p>
        연관된 웹 페이지를 제어하여 네트워크 요청을 가로채고 수정하며,
        리소스를 세밀하게 캐싱할 수 있습니다. 이를 통해 오프라인에서도
        웹 앱이 올바르게 동작하도록 할 수 있습니다.
      </p>
    </div>
    <!-- 팝업 오버레이 -->
    <div style="position:absolute; top:0; right:0; bottom:0; left:0; background:rgba(0,0,0,0.08); z-index:5;"></div>
    <div style="position:absolute; top:50px; right:80px; z-index:10; width:320px; background:#fff; border-radius:12px; box-shadow:0 8px 40px rgba(0,0,0,0.18); overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="padding:20px; font-size:14px; color:#333;">
        <div style="font-size:16px; font-weight:700; margin-bottom:4px;">AI One-Liner</div>
        <div style="font-size:12px; color:#888; margin-bottom:16px;">텍스트를 선택하면 AI가 한 줄로 설명해줍니다</div>

        <div style="font-size:12px; font-weight:600; color:#555; margin-bottom:8px;">OpenAI API Key</div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <input type="password" value="sk-proj-abcdefg" style="flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; outline:none;" />
          <button style="padding:8px 16px; background:${BRAND.primary}; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:600;">저장</button>
        </div>
        <div style="font-size:11px; color:#22c55e; margin-bottom:20px; display:flex; align-items:center; gap:4px;">✓ sk-p…hXyz 저장됨</div>

        <div style="font-size:12px; font-weight:600; color:#555; margin-bottom:8px;">트리거 모드</div>
        <div style="display:flex; margin-bottom:16px;">
          <button style="flex:1; padding:8px; border:1px solid ${BRAND.primary}; background:${BRAND.primary}; color:#fff; font-size:12px; font-weight:600; border-radius:8px 0 0 8px;">Auto</button>
          <button style="flex:1; padding:8px; border:1px solid #ddd; background:#fff; color:#666; font-size:12px; font-weight:600; border-radius:0 8px 8px 0; border-left:none;">Click</button>
        </div>

        <div style="font-size:11px; color:#888; background:#f8f9fa; padding:10px 12px; border-radius:8px; line-height:1.5;">
          <strong style="color:#555;">💡 Tip:</strong> PDF 뷰어에서는 텍스트를 선택한 뒤 우클릭 → "AI One-Liner" 메뉴를 이용하세요.
        </div>
      </div>
    </div>
  `);
}

function getSmallPromoHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 440px; height: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: ${BRAND.darkGrad};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #fff;
  }
  .container { text-align: center; padding: 0 32px; }
  .logo {
    width: 56px; height: 56px;
    background: rgba(255,255,255,0.12);
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 16px;
    border: 1px solid rgba(255,255,255,0.15);
  }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
  p { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; }
  .hl { color: ${BRAND.accent}; font-weight: 600; }
  .pill {
    display: inline-block; margin-top: 14px; padding: 5px 14px;
    background: rgba(96,165,250,0.15); border: 1px solid rgba(96,165,250,0.3);
    border-radius: 20px; font-size: 11px; color: #93c5fd; font-weight: 500;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">AI</div>
    <h1>AI One-Liner</h1>
    <p><span class="hl">드래그 한 번</span>이면, AI가 한 줄로 설명해줍니다</p>
    <span class="pill">Chrome Extension</span>
  </div>
</body></html>`;
}

function getMarqueePromoHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1400px; height: 560px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: ${BRAND.darkGrad};
    display: flex;
    align-items: center;
    overflow: hidden;
    color: #fff;
  }
  .left { flex: 1; padding: 0 80px; }
  .logo {
    width: 64px; height: 64px;
    background: rgba(255,255,255,0.10);
    border-radius: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26px; font-weight: 700;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.12);
  }
  h1 { font-size: 42px; font-weight: 800; margin-bottom: 12px; letter-spacing: -1px; line-height: 1.1; }
  .subtitle { font-size: 18px; color: rgba(255,255,255,0.65); margin-bottom: 28px; line-height: 1.5; }
  .hl { color: ${BRAND.accent}; }
  .features { display: flex; gap: 10px; flex-wrap: wrap; }
  .feat {
    padding: 6px 16px; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
    font-size: 13px; color: rgba(255,255,255,0.75);
  }
  .right {
    width: 580px; height: 560px;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .mockup {
    background: #fff; width: 440px; border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    overflow: hidden; color: #333;
  }
  .mock-tab {
    background: #dee1e6; padding: 6px 12px 0; display: flex; align-items: flex-end;
  }
  .mock-tab-item {
    background: #fff; padding: 5px 14px; border-radius: 6px 6px 0 0;
    font-size: 10px; color: #333; display: flex; align-items: center; gap: 4px;
  }
  .mock-tab-dot { width: 10px; height: 10px; border-radius: 3px; background: ${BRAND.primary}; }
  .mock-url {
    background: #fff; padding: 6px 12px; display: flex; align-items: center; gap: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  .mock-url-bar {
    flex: 1; background: #f1f3f4; border-radius: 12px; padding: 4px 10px;
    font-size: 9px; color: #5f6368;
  }
  .mock-body { padding: 20px 24px; position: relative; }
  .mock-body h2 { font-size: 14px; margin-bottom: 6px; color: #1a1a1a; }
  .mock-body p { font-size: 11px; line-height: 1.7; color: #555; }
  .mock-body mark { background: ${BRAND.highlight}; color: inherit; border-radius: 2px; padding: 0 1px; }
  .mock-tooltip {
    position: absolute; bottom: -16px; right: -16px;
    background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 10px 12px; width: 260px; color: #333;
  }
  .mock-tooltip .tt { font-size: 10px; line-height: 1.5; color: #1a1a1a; margin-bottom: 6px; }
  .mock-tooltip .ta { display: flex; gap: 4px; }
  .mock-tooltip .tb {
    padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; border: none;
  }
  .tb-more { background: #f0f7ff; color: ${BRAND.primary}; }
  .tb-ai { background: #1a1a1a; color: #fff; }
  .glow {
    position: absolute; width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%);
    top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;
  }
</style>
</head>
<body>
  <div class="left">
    <div class="logo">AI</div>
    <h1>AI One-Liner</h1>
    <p class="subtitle">
      <span class="hl">드래그 한 번</span>이면, AI가 한 줄로 설명해줍니다.<br>
      탭 전환 없이, 지금 보는 페이지에서 바로.
    </p>
    <div class="features">
      <span class="feat">한 줄 요약</span>
      <span class="feat">상세 설명</span>
      <span class="feat">출처 링크</span>
      <span class="feat">AI 바로가기</span>
      <span class="feat">PDF 지원</span>
    </div>
  </div>
  <div class="right">
    <div class="glow"></div>
    <div class="mockup">
      <div class="mock-tab">
        <div class="mock-tab-item"><div class="mock-tab-dot"></div>Service Worker API</div>
      </div>
      <div class="mock-url">
        <div class="mock-url-bar">🔒 developer.mozilla.org/ko/docs/Web/API</div>
      </div>
      <div class="mock-body">
        <h2>Service Worker API</h2>
        <p>
          Service Worker는 웹 애플리케이션과 네트워크 사이의
          프록시 서버 역할을 합니다. <mark>Service Worker</mark>는
          이벤트 기반 워커로, JavaScript 파일의 형태를 갖고 있습니다.
        </p>
        <div class="mock-tooltip">
          <div class="tt">웹 브라우저가 백그라운드에서 실행하는 스크립트로, 네트워크 요청 가로채기·캐싱 등을 처리하는 프록시 역할의 워커이다.</div>
          <div class="ta">
            <button class="tb tb-more">More</button>
            <button class="tb tb-ai">AI</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

main().catch(console.error);
