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

## all_urls 권한 Justification

> 본 확장의 핵심 기능은 사용자가 **어떤 웹페이지에서든** 텍스트를 선택하면 AI 설명을 제공하는 것입니다.
> 텍스트 선택 이벤트를 감지하려면 content script가 모든 페이지에 주입되어야 합니다.
> 특정 도메인으로 제한할 경우, 확장의 기본 기능이 작동하지 않습니다.
>
> Content script는 다음만 수행합니다:
> - 텍스트 선택 이벤트 감지 (`mouseup`, `keyup`)
> - 선택된 텍스트를 background service worker로 전달
> - 툴팁 UI 표시 (Shadow DOM으로 격리)
>
> 페이지 콘텐츠를 수집하거나 외부로 전송하지 않습니다.
> 사용자의 명시적 텍스트 선택 동작에 의해서만 API 호출이 발생합니다.

## 스크린샷 가이드

스토어 등록에 **최소 1장**의 스크린샷이 필요합니다.

### 필수 스크린샷 (1280x800 또는 640x400)
1. **메인 기능**: 웹페이지에서 텍스트를 선택하고 툴팁이 표시된 화면
2. **상세 설명**: "More" 버튼 클릭 후 상세 설명이 펼쳐진 화면
3. **설정 화면**: 팝업에서 API Key 입력 및 트리거 모드 설정 화면

### 프로모션 타일 (440x280, 권장)
- 확장 아이콘 + 간단한 사용 모습을 담은 이미지

### 촬영 방법
1. Chrome에서 확장을 로드 (`chrome://extensions` → 개발자 모드 → 압축 해제된 확장 로드)
2. 아무 웹페이지에서 텍스트 선택 → 툴팁 캡처
3. Windows: `Win+Shift+S` / Mac: `Cmd+Shift+4`로 영역 캡처
4. 촬영한 이미지를 `store/` 디렉토리에 저장

### 파일 이름 규칙
```
store/screenshot-1-main.png
store/screenshot-2-detail.png
store/screenshot-3-settings.png
store/promo-440x280.png
```
