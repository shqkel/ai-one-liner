# Design: AI One-Liner 크롬 익스텐션

## 1. 파일 구조

```
ai-one-liner/
├── manifest.json              # Chrome Extension Manifest V3
├── content/
│   ├── content.js             # 텍스트 선택 감지 + 트리거 모드 + 툴팁 렌더링 + 히스토리
│   └── content.css            # 호스트 페이지용 최소 스타일 (Shadow DOM 내부 스타일은 JS 주입)
├── background/
│   └── background.js          # OpenAI API 호출 + 컨텍스트 메뉴 + 메시지 핸들링
├── popup/
│   ├── popup.html             # API Key 관리 + 트리거 모드 토글 + PDF 안내 팁
│   ├── popup.css              # 팝업 스타일
│   └── popup.js               # 팝업 로직 (API Key CRUD + 트리거 모드 전환)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 2. 아키텍처

### 메시지 플로우 다이어그램

```
[Content Script]                          [Background (Service Worker)]
  │                                              │
  ├─ mouseup / keyup(Shift+방향키) 감지           │
  ├─ 선택 텍스트 추출 (2자 이상)                    │
  │                                              │
  ├─ [auto 모드] 즉시 트리거                       │
  │   └─ 페이지 하이라이트(mark 래핑)               │
  ├─ [manual 모드] 트리거 아이콘 표시               │
  │   └─ 아이콘 클릭 또는 A키 → 트리거 실행         │
  │                                              │
  ├─ 툴팁 UI 생성 (Shadow DOM)                    │
  ├─ chrome.runtime.sendMessage ────────────────►│
  │   {action: "getOneLiner", text}              │
  │                                              ├─ storage.sync에서 API Key 로드
  │                                              ├─ OpenAI Responses API 호출
  │                                              │   (gpt-4.1-mini + web_search 도구)
  │◄──────────────── response ───────────────────┤
  │   {success, result, citations}               │
  ├─ 툴팁에 한줄 설명 + 인용 링크 렌더링            │
  │                                              │
  ├─ "More" 클릭                                  │
  ├─ chrome.runtime.sendMessage ────────────────►│
  │   {action: "getDetailed", text}              │
  │                                              ├─ OpenAI API 호출 (상세 설명)
  │◄──────────────── response ───────────────────┤
  ├─ 툴팁 확장하여 상세 설명 + 인용 표시            │
  │                                              │
  ├─ AI 서비스 버튼 클릭 (ChatGPT 등)              │
  ├─ chrome.runtime.sendMessage ────────────────►│
  │   {action: "openAI", service, text}          │
  │                                              ├─ chrome.tabs.create (서비스별 URL)
  │                                              │
  ├─ API Key 미설정 시 "설정 열기" 클릭             │
  ├─ chrome.runtime.sendMessage ────────────────►│
  │   {action: "openPopup"}                      │
  │                                              ├─ chrome.action.openPopup()
  │                                              │
  │          [컨텍스트 메뉴 (PDF 대응)]             │
  │                                              ├─ 우클릭 → "AI One-Liner" 선택
  │                                              ├─ handleOneLiner() 실행
  │◄──── chrome.tabs.sendMessage ────────────────┤
  │   {action: "showOneLiner", text, result}     │
  ├─ ensureFixedTooltip() (화면 중앙 fixed)        │
  └─ 결과 렌더링                                   └─
```

### Storage 변경 감지 흐름

```
[Popup] ──storage.sync.set──► [chrome.storage] ──onChanged──► [Content Script]
  │  trigger_mode 변경              │                            │
  │  openai_api_key 변경            │                         triggerMode 갱신
```

## 3. 컴포넌트 상세 설계

### 3.1 manifest.json

| 항목 | 값 | 설명 |
|------|-----|------|
| `manifest_version` | `3` | Manifest V3 |
| `permissions` | `["storage", "activeTab", "contextMenus"]` | 설정 저장, 활성 탭 접근, 우클릭 메뉴 |
| `content_scripts.matches` | `["<all_urls>"]` | 모든 페이지에 주입 |
| `content_scripts.js` | `["content/content.js"]` | Content Script |
| `content_scripts.css` | `["content/content.css"]` | 호스트 페이지 스타일 |
| `background.service_worker` | `"background/background.js"` | Service Worker |
| `web_accessible_resources` | `["icons/icon48.png"]` (all_urls) | manual 모드 트리거 아이콘에서 사용 |

### 3.2 content/content.js 핵심 로직

전체가 IIFE `(() => { ... })()` 로 감싸져 전역 오염을 방지한다.

#### 3.2.1 트리거 모드 관리 (auto / manual)

```
초기 로드 시: storage.sync.get("trigger_mode") → triggerMode 변수 설정 (기본값 "auto")
실시간 반영: storage.onChanged 리스너 → trigger_mode 변경 시 즉시 갱신
```

- **auto 모드**: 텍스트 선택 즉시 API 호출 및 툴팁 표시
- **manual 모드**: 텍스트 선택 시 트리거 아이콘만 표시, 아이콘 클릭 또는 `A` 키로 실행

#### 3.2.2 트리거 아이콘 (manual 모드)

- `showTriggerIcon(text, x, y)`: 선택 영역 끝에 24x24 아이콘 버튼 표시
- Shadow DOM으로 격리, 아이콘 이미지는 `chrome.runtime.getURL("icons/icon48.png")`
- hover 시 `A` 키 힌트 표시 (10px 검정 배경 말풍선)
- `pendingSearch` 객체에 `{ text, x, y, range }` 저장
- `executePendingSearch()`: 아이콘 제거 → 툴팁 제거 → 페이지 하이라이트 → 검색 실행
- 뷰포트 오른쪽 벗어남 방지 (`requestAnimationFrame`으로 위치 보정)

#### 3.2.3 툴팁 관리

**두 가지 생성 방식:**

| 함수 | 위치 방식 | 사용 상황 |
|------|----------|----------|
| `ensureTooltip(x, y)` | `position: absolute` (스크롤 좌표) | 일반 페이지 텍스트 선택 |
| `ensureFixedTooltip()` | `position: fixed` (화면 중앙) | 컨텍스트 메뉴 결과 (PDF 뷰어 등) |

**공통 사항:**
- Shadow DOM (`mode: "open"`)으로 호스트 페이지 CSS 간섭 차단
- `id="ai-one-liner-host"`, `z-index: 2147483647`
- `TOOLTIP_STYLES` 상수로 스타일 주입
- `removeTooltip()`: 호스트 요소 제거 + 히스토리 초기화 + 페이지 하이라이트 해제

**뷰포트 보정 (ensureTooltip):**
- `requestAnimationFrame`에서 `getBoundingClientRect()` 체크
- 오른쪽 벗어남 → 왼쪽으로 이동
- 아래쪽 벗어남 → 위쪽으로 이동 (선택 영역 위)

#### 3.2.4 히스토리 네비게이션

```
상태 변수:
  history = []          // [{query, oneLiner, detailed, citations, detailedCitations, highlightText}]
  historyIndex = -1     // 현재 위치 (-1은 비어있음)
```

- 새 검색 시 현재 인덱스 이후 forward 히스토리 삭제 (`splice(historyIndex + 1)`)
- 히스토리 2개 이상일 때 네비게이션 바 표시: `◀ [인덱스/총개수 · 쿼리] ▶`
- `navigateHistory(delta)`: 인덱스 이동 후 `renderEntry()` 호출
- 툴팁 내부에서 텍스트 선택 → 새 검색 실행 (기존 엔트리에 `highlightText` 기록)
- `removeTooltip()` 시 히스토리 전체 초기화

#### 3.2.5 페이지 하이라이트 (mark 요소 래핑/해제)

**`setPageHighlight(range)`:**
1. `TreeWalker`로 range 내 텍스트 노드 수집
2. 각 텍스트 노드의 해당 구간을 `<mark class="ai-one-liner-hl">` 로 래핑
3. 스타일: `background: #fef08a; border-radius: 2px; padding: 0 1px`
4. `surroundContents()` 실패 시 무시 (복잡한 DOM 구조 대응)

**`clearPageHighlight()`:**
1. 각 mark 요소의 자식 노드를 부모에 삽입
2. mark 요소 제거
3. `parent.normalize()`로 인접 텍스트 노드 병합

#### 3.2.6 이벤트 핸들링

| 이벤트 | 동작 |
|--------|------|
| `mousedown` | 툴팁 내부 클릭 여부 기록 (`mousedownInside`). 외부 클릭 시 툴팁/트리거 아이콘 제거 |
| `mouseup` | (1) 트리거 아이콘 위 → 무시. (2) 툴팁 내부 드래그 → 선택 텍스트 2자 이상이면 툴팁 내부 재검색 (button/a 클릭 제외). (3) 페이지 드래그 → auto면 즉시 검색, manual이면 트리거 아이콘 표시 |
| `keyup` (Shift+방향키) | 300ms 디바운스 후 키보드 텍스트 선택 처리 (auto/manual 분기 동일) |
| `keydown` Escape | 툴팁 + 트리거 아이콘 제거 |
| `keydown` A | `pendingSearch` 있으면 `executePendingSearch()` 실행 (Ctrl/Meta/Alt 조합 제외) |
| `chrome.runtime.onMessage` (`showOneLiner`) | 컨텍스트 메뉴 결과 수신 → `ensureFixedTooltip()` → 결과 렌더링 |

#### 3.2.7 API Key 미설정 처리

- `triggerSearch()` 내에서 `storage.sync.get("openai_api_key")` 체크
- 미설정 시 `showNoKey()` 호출: 열쇠 아이콘 + "API Key가 필요합니다" + "설정 열기" 버튼
- "설정 열기" 클릭 → `sendMessage({action: "openPopup"})` → Background가 `chrome.action.openPopup()` 실행

### 3.3 background/background.js

#### 3.3.1 컨텍스트 메뉴 등록

```
onInstalled → contextMenus.create({
  id: "ai-one-liner",
  title: 'AI One-Liner: "%s"',
  contexts: ["selection"]
})
```

- `%s` 는 선택된 텍스트로 치환됨
- 클릭 시 `handleOneLiner()` 호출 후 결과를 `tabs.sendMessage`로 Content Script에 전달

#### 3.3.2 메시지 핸들러

| action | 처리 | 비동기 | 응답 |
|--------|------|--------|------|
| `getOneLiner` | `handleOneLiner(text)` | `return true` | `{success, result, citations}` |
| `getDetailed` | `handleDetailed(text)` | `return true` | `{success, result, citations}` |
| `openPopup` | `chrome.action.openPopup()` | `return false` | - |
| `openAI` | `chrome.tabs.create({ url })` | `return false` | - |

**openAI 지원 서비스:**

| service | URL 패턴 |
|---------|---------|
| `chatgpt` | `https://chatgpt.com/?q={q}` |
| `perplexity` | `https://www.perplexity.ai/search?q={q}` |
| `claude` | `https://claude.ai/new?q={q}` |
| `gemini` | `https://gemini.google.com/app?q={q}` |
| `grok` | `https://grok.com/?q={q}` |

#### 3.3.3 OpenAI API 호출

**API 설정:**
- Endpoint: `https://api.openai.com/v1/responses` (Responses API)
- Model: `gpt-4.1-mini`
- Tools: `[{ type: "web_search" }]` (정확한 정보 검색용)
- Temperature: `0` (결정적 응답)
- System instructions: "정확한 사실만 전달하는 사전형 도우미, 웹 검색 활용, 추측 금지, 한국어 응답"

**프롬프트 및 토큰 제한:**

| 함수 | 프롬프트 | max_output_tokens |
|------|---------|-------------------|
| `handleOneLiner` | `"다음 문구/단어를 한 줄(1문장)로 간결하게 설명해줘: "{text}"` | 60 |
| `handleDetailed` | `"다음 문구/단어를 3~4줄로 자세히 설명해줘: "{text}"` | 400 |

**인용 처리:**
1. 응답의 `output_text` 항목에서 `url_citation` 어노테이션 추출 → `[{title, url}]`
2. 응답 텍스트에서 인라인 인용 마크업 제거:
   - `([title](url))` 패턴 제거
   - `[title](url)` 패턴 제거
3. 반환값: `{ success: true, result, citations }`

**에러 처리:**
- API Key 미설정 → `{ success: false, error: "API Key가 설정되지 않았습니다..." }`
- HTTP 오류 → `{ success: false, error: "API 오류 (status)" }` 또는 `error.message`
- 텍스트 출력 없음 → `{ success: false, error: "응답을 가져올 수 없습니다." }`
- 네트워크 오류 → `{ success: false, error: "네트워크 오류: ..." }`

### 3.4 popup/ (API Key 관리 + 트리거 모드 토글 + PDF 안내 팁)

#### 3.4.1 API Key 관리

- **미설정 상태 (`#no-key`)**: 안내 문구 + API Key 발급 링크 + password input + 저장 버튼
- **설정 완료 상태 (`#has-key`)**: "API Key 설정됨" + 마스킹된 키 (`sk-****...****1234`) + 삭제 버튼
- `maskKey()`: 8자 이하면 `****`, 그 이상이면 앞 4자 + `****` + 뒤 4자
- 저장: `chrome.storage.sync.set({ openai_api_key: key })`
- 삭제: `chrome.storage.sync.remove("openai_api_key")`

#### 3.4.2 트리거 모드 토글

- toggle-group 내 두 버튼: `자동` (data-mode="auto") / `클릭` (data-mode="manual")
- 초기 로드 시 `storage.sync.get("trigger_mode")` → active 클래스 설정 (기본값 `auto`)
- 클릭 시 `storage.sync.set({ trigger_mode })` → Content Script가 `onChanged`로 실시간 반영
- "클릭" 버튼 title: "텍스트 선택 후 아이콘 클릭 또는 A키"

#### 3.4.3 PDF 안내 팁

- `?` 아이콘 hover 시 말풍선 표시
- 내용: "PDF에서는 텍스트 선택 후 우클릭 → AI One-Liner 메뉴를 이용하세요."
- 구현: CSS `:hover` 로 `.tip-bubble` 을 `display: block` 전환

## 4. 데이터 흐름

### Storage 키

| 키 | 저장소 | 타입 | 기본값 | 설명 |
|----|--------|------|--------|------|
| `openai_api_key` | `chrome.storage.sync` | `string` | `null` | OpenAI API Key |
| `trigger_mode` | `chrome.storage.sync` | `"auto" \| "manual"` | `"auto"` | 트리거 모드 |

### 데이터 흐름도

```
[Popup]
  │
  ├─ 저장 → storage.sync.set({ openai_api_key }) ──────►[storage.sync]
  ├─ 삭제 → storage.sync.remove("openai_api_key") ─────►[storage.sync]
  ├─ 토글 → storage.sync.set({ trigger_mode }) ────────►[storage.sync]
  │                                                          │
  │                                           onChanged ◄────┘
  │                                               │
  │                                               ▼
  │                                       [Content Script]
  │                                         triggerMode 갱신
  │
[Content Script]
  │
  ├─ triggerSearch() → storage.sync.get("openai_api_key") ──► API Key 체크
  │
  ├─ sendMessage({action: "getOneLiner"}) ──────────────────►[Background]
  │                                                              │
  │                                                    getApiKey()
  │                                                    = storage.sync.get("openai_api_key")
  │                                                              │
  │                                                    callOpenAI(prompt, maxTokens)
  │                                                              │
  │◄──────────── {success, result, citations} ──────────────────┘
```

## 5. UI 설계

### 5.1 툴팁 레이아웃

**한줄 설명 상태:**
```
┌──────────────────────────────────────────┐
│ [한줄 설명 텍스트]                         │
│                                          │
│ 🔗 인용 링크 1                            │
│ 🔗 인용 링크 2                            │
│ ─────────────────────────────────────    │
│  [More]  [⚡ ChatGPT ▸ Gemini Grok ...]  │
└──────────────────────────────────────────┘
```

**상세 설명 확장 후:**
```
┌──────────────────────────────────────────┐
│ ◀  1/3 · 검색어     ▶                    │  ← 히스토리 2개 이상 시 표시
│                                          │
│ [한줄 설명 텍스트]                         │
│ ─────────────────────────────            │
│ [3~4줄 상세 설명 텍스트가                  │
│  여기에 추가로 표시됩니다.]                 │
│                                          │
│ 🔗 인용 링크 1                            │
│ 🔗 인용 링크 2                            │
│ ─────────────────────────────────────    │
│  [⚡ ChatGPT ▸ Gemini Grok Perp Claude]  │
└──────────────────────────────────────────┘
```

**API Key 미설정 시:**
```
┌──────────────────────────────┐
│ 🔑  API Key가 필요합니다.     │
│     [설정 열기]               │
└──────────────────────────────┘
```

**스타일 상세:**
- 배경: `#fff`, 테두리: `1px solid #e5e7eb`, 그림자: `0 4px 24px rgba(0,0,0,0.12)`
- 둥근 모서리: `12px`, 패딩: `14px 16px`
- 최대 너비: `400px`, 최소 너비: `200px`
- 폰트: 시스템 기본 (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`), `14px`
- 등장 애니메이션: `fadeIn 0.15s` (opacity 0→1, translateY 4px→0)

**AI 서비스 버튼 그룹:**
- 기본: ChatGPT 트리거 버튼만 표시 (검정 pill, `#1a1a1a`)
- hover 시 오른쪽으로 확장: Gemini, Grok, Perplexity, Claude 아이콘 버튼 슬라이드
- 확장 애니메이션: `max-width 0→200px`, `opacity 0→1` (0.25s ease)
- 각 버튼에 SVG 아이콘 (14x14) 내장

### 5.2 트리거 아이콘 (manual 모드)

```
  [선택된 텍스트]  🔍 A
                   ↑    ↑
               아이콘  hover 힌트
```

- 크기: `24x24` 버튼, 내부 이미지 `18x18`
- 배경: 투명, hover 시 `scale(1.15)` + `opacity 0.8→1`
- 힌트 말풍선: `A` 텍스트, 검정 배경, hover 시 fade-in
- 위치: 선택 영역 오른쪽 끝 + 4px, 상단 - 4px

### 5.3 팝업 레이아웃

```
┌─────────────────────────────┐
│  🔑 AI One-Liner             │
│                              │
│  [API Key 미설정 시]          │
│  OpenAI API Key를             │
│  입력해주세요.                │
│  API Key 발급받기 →           │
│  ┌─────────────────────┐    │
│  │ sk-...              │    │
│  └─────────────────────┘    │
│  [        저장        ]      │
│                              │
│  [API Key 설정 완료 시]       │
│  ✅ API Key 설정됨            │
│  sk-****...****1234          │
│  [        삭제        ]      │
│                              │
│  ─────────────────────────  │
│  트리거    [자동] [클릭]      │
│                              │
│  (?) PDF에서는 텍스트 선택 후  │
│      우클릭 → AI One-Liner   │
│      메뉴를 이용하세요.       │
└─────────────────────────────┘
```

- 너비: `300px`, 패딩: `20px`
- 저장 버튼: `#2563eb` (파란색)
- 삭제 버튼: `#fee2e2` 배경 + `#dc2626` 텍스트 (빨간 계열)
- 트리거 토글: pill 형태 그룹 (`#f0f0f0` 배경), active 시 `#fff` + 그림자
- 팁 아이콘: `18x18` 원형 (`#e5e7eb` 배경), hover 시 검정 말풍선 표시

### 5.4 페이지 하이라이트

- 선택 텍스트를 `<mark class="ai-one-liner-hl">` 로 래핑
- 스타일: `background: #fef08a` (연한 노랑), `border-radius: 2px`, `padding: 0 1px`
- 툴팁 내 설명 텍스트에서도 검색어를 `<mark>` 로 하이라이트 (`setTextWithHighlight()`)
- 툴팁 닫힐 때 하이라이트 자동 해제 (`clearPageHighlight()`)
