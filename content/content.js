(() => {
  // --- 설정 ---

  let triggerMode = "auto";
  chrome.storage.sync.get("trigger_mode", (data) => {
    triggerMode = data.trigger_mode || "auto";
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.trigger_mode) triggerMode = changes.trigger_mode.newValue || "auto";
  });

  // --- 상태 ---

  let tooltipHost = null;
  let tooltipEl = null;
  const history = []; // [{query, oneLiner, detailed, citations, detailedCitations, highlightText}]
  let historyIndex = -1;

  let triggerIconHost = null;
  let pendingSearch = null; // { text, x, y, range }

  let highlightMarks = [];
  let mousedownInside = false;
  let keySelectionTimer = null;
  let lastSelectedText = null; // 복사용 텍스트 보존

  const extensionIconUrl = chrome.runtime.getURL("icons/icon48.png");

  // --- 유틸리티 ---

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function createEntry(query) {
    return { query, oneLiner: null, detailed: null, citations: null, detailedCitations: null, highlightText: null };
  }

  function getSelectionPosition(range) {
    const rect = range.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 8,
      right: rect.right + window.scrollX + 4,
      top: rect.top + window.scrollY - 4,
    };
  }

  // --- 트리거 아이콘 (manual 모드) ---

  function removeTriggerIcon() {
    if (triggerIconHost) {
      triggerIconHost.remove();
      triggerIconHost = null;
    }
    pendingSearch = null;
  }

  function showTriggerIcon(text, x, y) {
    removeTriggerIcon();

    const host = document.createElement("div");
    host.id = "ai-one-liner-trigger";
    host.style.position = "absolute";
    host.style.zIndex = "2147483647";
    host.style.left = `${x}px`;
    host.style.top = `${y}px`;

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap { position: relative; display: inline-block; }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 0.1s, opacity 0.12s;
          opacity: 0.8;
        }
        button:hover { transform: scale(1.15); opacity: 1; }
        img { width: 18px; height: 18px; }
        .hint {
          position: absolute;
          left: 34px;
          top: 50%;
          transform: translateY(-50%);
          background: #1a1a1a;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
        }
        .wrap:hover .hint { opacity: 1; }
      </style>
      <div class="wrap">
        <button><img src="${extensionIconUrl}" /></button>
        <span class="hint">A</span>
      </div>
    `;

    document.body.appendChild(host);
    triggerIconHost = host;
    pendingSearch = { text, x, y, range: null };

    shadow.querySelector("button").addEventListener("click", executePendingSearch);

    adjustHorizontalOverflow(host, x);
  }

  function executePendingSearch() {
    if (!pendingSearch) return;
    const { text, x, y, range } = pendingSearch;
    removeTriggerIcon();
    removeTooltip();
    if (range) setPageHighlight(range);
    triggerSearch(text, x, y, false);
  }

  // --- 페이지 하이라이트 ---

  function setPageHighlight(range) {
    clearPageHighlight();
    if (!range) return;
    try {
      const ancestor = range.commonAncestorContainer;
      const root = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor;
      const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while ((node = treeWalker.nextNode())) {
        if (range.intersectsNode(node)) textNodes.push(node);
      }
      for (const tn of textNodes) {
        const start = tn === range.startContainer ? range.startOffset : 0;
        const end = tn === range.endContainer ? range.endOffset : tn.length;
        if (start >= end) continue;
        const r = document.createRange();
        r.setStart(tn, start);
        r.setEnd(tn, end);
        const mark = document.createElement("mark");
        mark.className = "ai-one-liner-hl";
        mark.style.cssText = "background:#fef08a;color:inherit;border-radius:2px;padding:0 1px;";
        r.surroundContents(mark);
        highlightMarks.push(mark);
      }
    } catch (_) {
      // surroundContents 실패 시 무시
    }
  }

  function clearPageHighlight() {
    for (const mark of highlightMarks) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
    highlightMarks = [];
  }

  // --- 툴팁 스타일/아이콘 상수 ---

  const TOOLTIP_STYLES = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    .tooltip {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      padding: 14px 16px;
      max-width: 400px;
      min-width: 200px;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      transition: background 0.12s, color 0.12s;
    }
    .nav-btn:hover:not(:disabled) {
      background: #f0f0f0;
      color: #1a1a1a;
    }
    .nav-btn:disabled {
      color: #ddd;
      cursor: default;
    }
    .nav-query {
      flex: 1;
      font-size: 11px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #888;
      font-size: 13px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .one-liner {
      font-size: 14px;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .detailed {
      font-size: 13px;
      color: #444;
      margin-bottom: 10px;
      padding-top: 10px;
      border-top: 1px solid #f0f0f0;
      white-space: pre-wrap;
    }
    .error {
      font-size: 13px;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .no-key {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #666;
    }
    .no-key-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .no-key-btn {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .no-key-btn:hover {
      background: #1d4ed8;
    }
    mark {
      background: #fef08a;
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }
    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn {
      padding: 5px 12px;
      border: none;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .btn:active {
      transform: scale(0.96);
    }
    .btn-more {
      background: #f0f7ff;
      color: #2563eb;
      min-width: 52px;
      text-align: center;
    }
    .btn-more:hover {
      background: #dbeafe;
    }
    .btn-more.loading-btn {
      pointer-events: none;
    }
    .dot-loading::after {
      content: "·";
      animation: dots 1s steps(3) infinite;
    }
    @keyframes dots {
      0%   { content: "·"; }
      33%  { content: "··"; }
      66%  { content: "···"; }
    }
    .ai-group {
      position: relative;
      display: inline-flex;
      align-items: center;
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
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s, border-radius 0.15s;
    }
    .ai-trigger:hover {
      background: #333;
    }
    .ai-trigger svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .ai-expand {
      display: flex;
      overflow: hidden;
      max-width: 0;
      opacity: 0;
      transition: max-width 0.25s ease, opacity 0.2s ease;
    }
    .ai-group:hover .ai-expand {
      max-width: 200px;
      opacity: 1;
    }
    .ai-group:hover .ai-trigger {
      border-radius: 20px 0 0 20px;
    }
    .ai-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 28px;
      border: none;
      cursor: pointer;
      background: #f5f5f5;
      transition: background 0.12s;
      padding: 0;
    }
    .ai-btn:hover {
      background: #e0e0e0;
    }
    .ai-btn:last-child {
      border-radius: 0 20px 20px 0;
    }
    .ai-btn svg {
      width: 14px;
      height: 14px;
    }
    .citations {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
    }
    .citations a {
      display: block;
      font-size: 11px;
      color: #2563eb;
      text-decoration: none;
      padding: 3px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .citations a:hover {
      text-decoration: underline;
    }
    .citations a::before {
      content: "🔗 ";
    }
  `;

  const AI_ICONS = {
    openai: `<svg viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
    perplexity: `<svg viewBox="0 0 512 510"><path fill="#1F1F1F" d="M116 0h281c63 0 115 52 115 116v278c0 64-52 116-115 116H116C52 510 0 458 0 394V116C0 52 52 0 116 0z"/><path fill="#fff" fill-rule="nonzero" d="M349 128l-69 58h69v-58zm-84 49l101-85v95h32v143h-39v90l-94-87v84h-17v-84l-97 86v-90h-37V186h39V91l95 85v-83h17v84zm-29 27c-35 0-70 0-105 0v109h20v-27l85-82zm41 0l82 82v27h22V203c-35 0-69 0-104 0zm-43-17l-65-58v58h65zm14 124v-95l-80 78v89l80-72zm17-95v95l77 71v-89l-77-77z"/></svg>`,
    claude: `<svg viewBox="0 0 16 16"><path fill="#D97757" d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/></svg>`,
    gemini: `<svg viewBox="0 0 65 65"><path fill="#4285F4" d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z"/></svg>`,
    grok: `<svg viewBox="0 0 512 510"><path d="M116 0h281c63 0 115 52 115 116v278c0 64-52 116-115 116H116C52 510 0 458 0 394V116C0 52 52 0 116 0z"/><path fill="#fff" d="M213 306l179-180v0l52-52c-1 1-2 3-3 4-39 54-58 81-43 147l0 0c11 45-1 95-37 132-46 46-120 57-181 15l42-20c39 15 81 9 112-22 31-31 37-75 22-112-3-7-12-9-18-4l-125 92zm-26 22l0 0L68 435c8-10 17-20 26-30 27-28 53-55 37-94-21-52-9-113 31-153 41-41 102-52 153-31 11 4 21 10 29 16l-43 20c-39-17-84-5-112 22-37 37-45 102-1 144z"/></svg>`,
  };

  // --- 툴팁 관리 ---

  function removeTooltip() {
    if (tooltipHost) {
      tooltipHost.remove();
      tooltipHost = null;
      tooltipEl = null;
      history.length = 0;
      historyIndex = -1;
    }
    clearPageHighlight();
    lastSelectedText = null;
  }

  function createTooltipHost(positionStyle) {
    const host = document.createElement("div");
    host.id = "ai-one-liner-host";
    Object.assign(host.style, { zIndex: "2147483647", ...positionStyle });

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = TOOLTIP_STYLES;
    shadow.appendChild(style);

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    shadow.appendChild(tooltip);

    document.body.appendChild(host);
    tooltipHost = host;
    tooltipEl = tooltip;
  }

  function ensureFixedTooltip() {
    if (tooltipHost) return;
    createTooltipHost({
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    });
  }

  function ensureTooltip(x, y) {
    if (tooltipHost) return;
    createTooltipHost({
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
    });
    adjustOverflow(tooltipHost, x, y);
  }

  // --- 뷰포트 보정 ---

  function adjustHorizontalOverflow(host, x) {
    requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        host.style.left = `${Math.max(0, x - rect.width)}px`;
      }
    });
  }

  function adjustOverflow(host, x, y) {
    requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        host.style.left = `${Math.max(0, x - rect.width)}px`;
      }
      if (rect.bottom > window.innerHeight) {
        host.style.top = `${Math.max(0, y - rect.height - 10)}px`;
      }
    });
  }

  function adjustBottomOverflow() {
    requestAnimationFrame(() => {
      if (!tooltipHost) return;
      const rect = tooltipHost.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        const currentTop = parseInt(tooltipHost.style.top);
        tooltipHost.style.top = `${Math.max(0, currentTop - (rect.bottom - window.innerHeight) - 10)}px`;
      }
    });
  }

  // --- 네비게이션 바 ---

  function createNavBar(indicatorText) {
    if (history.length <= 1) return null;

    const nav = document.createElement("div");
    nav.className = "nav";

    const backBtn = document.createElement("button");
    backBtn.className = "nav-btn";
    backBtn.innerHTML = "&#9664;";
    backBtn.title = "뒤로";
    backBtn.disabled = historyIndex <= 0;
    backBtn.addEventListener("click", () => navigateHistory(-1));

    const indicator = document.createElement("span");
    indicator.className = "nav-query";
    indicator.textContent = indicatorText;

    const forwardBtn = document.createElement("button");
    forwardBtn.className = "nav-btn";
    forwardBtn.innerHTML = "&#9654;";
    forwardBtn.title = "앞으로";
    forwardBtn.disabled = historyIndex >= history.length - 1;
    forwardBtn.addEventListener("click", () => navigateHistory(1));

    nav.appendChild(backBtn);
    nav.appendChild(indicator);
    nav.appendChild(forwardBtn);
    return nav;
  }

  function navigateHistory(delta) {
    const newIndex = historyIndex + delta;
    if (newIndex < 0 || newIndex >= history.length) return;
    historyIndex = newIndex;
    renderEntry(history[historyIndex]);
  }

  // --- 렌더링 ---

  function setTextWithHighlight(el, text, highlight) {
    if (!text) return;
    if (!highlight) {
      el.textContent = text;
      return;
    }
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) {
      el.textContent = text;
      return;
    }
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + highlight.length);
    const after = text.slice(idx + highlight.length);
    el.innerHTML = escapeHtml(before) + "<mark>" + escapeHtml(match) + "</mark>" + escapeHtml(after);
  }

  function renderCitations(container, citations, beforeEl) {
    if (!citations || citations.length === 0) return;
    const seen = new Set();
    const unique = citations.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
    const div = document.createElement("div");
    div.className = "citations";
    unique.forEach((c) => {
      const a = document.createElement("a");
      a.href = c.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = c.title;
      div.appendChild(a);
    });
    if (beforeEl) {
      container.insertBefore(div, beforeEl);
    } else {
      container.appendChild(div);
    }
  }

  function renderEntry(entry) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = "";

    // 네비게이션 바
    const nav = createNavBar(`${historyIndex + 1}/${history.length} \u00b7 ${entry.query}`);
    if (nav) tooltipEl.appendChild(nav);

    // 한줄 설명
    const oneLiner = document.createElement("div");
    oneLiner.className = "one-liner";
    setTextWithHighlight(oneLiner, entry.oneLiner, entry.highlightText);
    tooltipEl.appendChild(oneLiner);

    // 상세 설명
    if (entry.detailed) {
      const detailed = document.createElement("div");
      detailed.className = "detailed";
      setTextWithHighlight(detailed, entry.detailed, entry.highlightText);
      tooltipEl.appendChild(detailed);
    }

    // 인용 링크
    const allCitations = entry.detailed ? entry.detailedCitations : entry.citations;
    const actionsEl = document.createElement("div");
    actionsEl.className = "actions";
    tooltipEl.appendChild(actionsEl);

    renderCitations(tooltipEl, allCitations, actionsEl);

    // More 버튼
    if (!entry.detailed) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn btn-more";
      moreBtn.textContent = "More";
      moreBtn.addEventListener("click", () => {
        moreBtn.innerHTML = '<span class="dot-loading"></span>';
        moreBtn.classList.add("loading-btn");
        chrome.runtime.sendMessage({ action: "getDetailed", text: entry.query }, (response) => {
          if (response?.success) {
            entry.detailed = response.result;
            entry.detailedCitations = response.citations;
            renderEntry(entry);
          } else {
            moreBtn.textContent = "More";
            moreBtn.classList.remove("loading-btn");
          }
        });
      });
      actionsEl.appendChild(moreBtn);
    }

    // AI 서비스 버튼 그룹
    const aiGroup = document.createElement("div");
    aiGroup.className = "ai-group";
    aiGroup.innerHTML = `
      <button class="ai-trigger" data-service="chatgpt" title="ChatGPT">${AI_ICONS.openai}</button>
      <div class="ai-expand">
        <button class="ai-btn" data-service="gemini" title="Gemini">${AI_ICONS.gemini}</button>
        <button class="ai-btn" data-service="grok" title="Grok">${AI_ICONS.grok}</button>
        <button class="ai-btn" data-service="perplexity" title="Perplexity">${AI_ICONS.perplexity}</button>
        <button class="ai-btn" data-service="claude" title="Claude">${AI_ICONS.claude}</button>
      </div>
    `;
    actionsEl.appendChild(aiGroup);

    aiGroup.querySelectorAll("[data-service]").forEach((btn) => {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openAI", service: btn.dataset.service, text: entry.query });
      });
    });

    adjustBottomOverflow();
  }

  function showLoading() {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = "";

    const nav = createNavBar(`${historyIndex + 1}/${history.length}`);
    if (nav) {
      // 로딩 중이므로 앞으로 버튼 비활성화
      nav.querySelector(".nav-btn:last-child").disabled = true;
      tooltipEl.appendChild(nav);
    }

    const loading = document.createElement("div");
    loading.className = "loading";
    loading.innerHTML = '<div class="spinner"></div><span>설명을 가져오는 중...</span>';
    tooltipEl.appendChild(loading);
  }

  function showError(msg) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
  }

  function showNoKey() {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = `
      <div class="no-key">
        <span class="no-key-icon">🔑</span>
        <div>
          API Key가 필요합니다.
          <br><button class="no-key-btn">설정 열기</button>
        </div>
      </div>
    `;
    tooltipEl.querySelector(".no-key-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openPopup" });
    });
  }

  // --- 검색 실행 ---

  function triggerSearch(text, x, y, fromInside) {
    ensureTooltip(x, y);
    chrome.storage.sync.get("openai_api_key", (data) => {
      if (!data.openai_api_key) {
        showNoKey();
        return;
      }
      doSearch(text, fromInside);
    });
  }

  function doSearch(text, fromInside) {
    // 이전 엔트리에 하이라이트 텍스트 저장 (툴팁 내부 검색일 때)
    if (fromInside && historyIndex >= 0 && history[historyIndex]) {
      history[historyIndex].highlightText = text;
    }

    // 현재 위치 이후의 forward 히스토리 제거
    history.splice(historyIndex + 1);

    const entry = createEntry(text);
    history.push(entry);
    historyIndex = history.length - 1;

    showLoading();

    chrome.runtime.sendMessage({ action: "getOneLiner", text }, (response) => {
      if (response?.success) {
        entry.oneLiner = response.result;
        entry.citations = response.citations;
        if (history[historyIndex] === entry) {
          renderEntry(entry);
        }
      } else {
        showError(response?.error || "알 수 없는 오류가 발생했습니다.");
      }
    });
  }

  // --- 텍스트 선택 공통 처리 ---

  function handleTextSelection(text, range) {
    const pos = getSelectionPosition(range);

    if (triggerMode === "manual") {
      showTriggerIcon(text, pos.right, pos.top);
      pendingSearch.range = range.cloneRange();
    } else {
      removeTooltip();
      lastSelectedText = text;
      setPageHighlight(range.cloneRange());
      triggerSearch(text, pos.x, pos.y, false);
    }
  }

  // --- 이벤트 핸들링 ---

  function isInsideTooltip(e) {
    return tooltipHost && e.composedPath().includes(tooltipHost);
  }

  function isInsideTriggerIcon(e) {
    return triggerIconHost && e.composedPath().includes(triggerIconHost);
  }

  document.addEventListener("mousedown", (e) => {
    mousedownInside = isInsideTooltip(e);
    if (isInsideTriggerIcon(e)) return;
    if (!mousedownInside) {
      if (tooltipHost) removeTooltip();
      removeTriggerIcon();
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (isInsideTriggerIcon(e)) return;

    const sel = window.getSelection();
    const text = sel?.toString().trim();

    // 툴팁 내부에서 드래그한 경우
    if (mousedownInside) {
      mousedownInside = false;
      if (text && text.length >= 2) {
        const target = e.composedPath()[0];
        if (target?.closest?.("button, a")) return;

        const range = sel.getRangeAt(0);
        const pos = getSelectionPosition(range);
        triggerSearch(text, pos.x, pos.y, true);
      }
      return;
    }

    // 페이지에서 드래그
    if (!text || text.length < 2) return;
    handleTextSelection(text, sel.getRangeAt(0));
  });

  // 키보드 선택
  document.addEventListener("keyup", (e) => {
    if (!e.shiftKey) return;
    const selectionKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!selectionKeys.includes(e.key)) return;

    clearTimeout(keySelectionTimer);
    keySelectionTimer = setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 2) return;
      handleTextSelection(text, sel.getRangeAt(0));
    }, 300);
  });

  // 컨텍스트 메뉴에서 트리거된 결과 수신 (PDF 뷰어 대응)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showOneLiner") {
      removeTooltip();

      const entry = createEntry(message.text);
      history.splice(0);
      history.push(entry);
      historyIndex = 0;

      ensureFixedTooltip();

      if (message.result?.success) {
        entry.oneLiner = message.result.result;
        entry.citations = message.result.citations;
        renderEntry(entry);
      } else {
        showError(message.result?.error || "알 수 없는 오류가 발생했습니다.");
      }
    }
  });

  // Ctrl+C 복사 지원: 하이라이트로 선택이 해제된 경우 저장된 텍스트로 복사
  document.addEventListener("copy", (e) => {
    if (!lastSelectedText || !tooltipHost) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return; // 직접 선택한 텍스트가 있으면 기본 동작
    e.preventDefault();
    e.clipboardData.setData("text/plain", lastSelectedText);
  });

  // ESC -> 툴팁/아이콘 닫기, A -> 트리거 실행
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      removeTooltip();
      removeTriggerIcon();
    }
    if ((e.key === "a" || e.key === "A") && !e.ctrlKey && !e.metaKey && !e.altKey && pendingSearch) {
      e.preventDefault();
      executePendingSearch();
    }
  });
})();
