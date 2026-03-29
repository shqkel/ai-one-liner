# Chrome Web Store 등록 정보

## 기본 정보

- **이름**: AI One-Liner
- **요약 설명** (132자 이내): 텍스트를 선택하면 AI가 한 줄로 설명해줍니다. OpenAI 기반의 즉시 용어 해설 도구.
- **카테고리**: 생산성 (Productivity)
- **언어**: 한국어

## 자세한 설명 (스토어 페이지용)

웹 페이지에서 모르는 단어나 문구를 드래그하면, AI가 즉시 한 줄로 설명해주는 Chrome 확장 프로그램입니다.

주요 기능:
• 텍스트 선택만으로 즉시 AI 설명 (한 줄 요약)
• "More" 버튼으로 상세 설명 확장
• 자동/수동 트리거 모드 전환
• ChatGPT, Claude, Gemini, Grok, Perplexity 바로가기
• 검색 히스토리 탐색 (이전/다음)
• PDF 뷰어에서도 우클릭 메뉴로 사용 가능
• 출처 링크 표시 (웹 검색 기반 팩트 체크)

사용법:
1. 확장 아이콘을 클릭하여 OpenAI API Key를 입력합니다
2. 웹 페이지에서 텍스트를 드래그하면 자동으로 설명이 나타납니다
3. "More" 버튼으로 더 자세한 설명을 볼 수 있습니다

※ OpenAI API Key가 필요합니다 (https://platform.openai.com/api-keys)

---

## Privacy practices 탭 입력 항목

### Single purpose description

```
사용자가 웹 페이지에서 선택한 텍스트에 대해 AI 기반의 한 줄 설명을 즉시 제공합니다.
```

### Permission justifications

#### activeTab

```
사용자가 텍스트를 선택할 때 현재 활성 탭의 선택된 텍스트를 읽어 AI 설명을 생성합니다. 확장은 사용자의 명시적 동작(텍스트 드래그 또는 우클릭 메뉴 선택) 시에만 현재 탭에 접근하며, 백그라운드에서 탭 콘텐츠에 접근하지 않습니다.
```

#### contextMenus

```
PDF 뷰어 등 content script가 텍스트 선택 이벤트를 감지할 수 없는 환경에서, 사용자가 우클릭 메뉴를 통해 선택한 텍스트의 AI 설명을 요청할 수 있도록 컨텍스트 메뉴 항목을 추가합니다.
```

#### storage

```
사용자가 입력한 OpenAI API Key와 트리거 모드 설정(자동/수동)을 브라우저에 저장합니다. chrome.storage.sync를 사용하여 사용자 기기 간 설정을 동기화합니다. 사용자의 개인정보나 브라우징 데이터는 저장하지 않습니다.
```

#### Host permission (content script <all_urls>)

```
본 확장의 핵심 기능은 사용자가 어떤 웹페이지에서든 텍스트를 선택하면 AI 설명을 제공하는 것입니다. 텍스트 선택 이벤트(mouseup, keyup)를 감지하기 위해 content script가 모든 페이지에 주입되어야 합니다. content script는 텍스트 선택 감지와 툴팁 UI 표시만 수행하며, 페이지 콘텐츠를 수집하거나 외부로 전송하지 않습니다. 사용자의 명시적 텍스트 선택 동작에 의해서만 API 호출이 발생합니다.
```

#### Remote code

```
본 확장은 원격 코드를 실행하지 않습니다. 모든 JavaScript는 확장 패키지 내에 포함되어 있습니다. 외부 서버와의 통신은 사용자가 텍스트를 선택했을 때 OpenAI API(api.openai.com)에 선택된 텍스트를 전송하여 설명을 받아오는 것뿐이며, 응답은 텍스트 데이터로만 처리됩니다. 외부에서 코드를 다운로드하거나 eval()을 사용하지 않습니다.
```

### Data usage certification 체크리스트

아래 항목을 확인 후 체크:

- [x] I do not sell user data to third parties
- [x] I do not use or transfer user data for purposes unrelated to the item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes
