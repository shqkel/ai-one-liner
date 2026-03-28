// 컨텍스트 메뉴 (PDF 뷰어 등 이벤트 감지 불가 환경 대응)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai-one-liner",
    title: "AI One-Liner: \"%s\"",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ai-one-liner" && info.selectionText) {
    handleOneLiner(info.selectionText).then((result) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "showOneLiner",
        text: info.selectionText,
        result,
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getOneLiner") {
    handleOneLiner(message.text).then(sendResponse);
    return true;
  }

  if (message.action === "getDetailed") {
    handleDetailed(message.text).then(sendResponse);
    return true;
  }

  if (message.action === "openPopup") {
    // chrome.action.openPopup()은 user gesture 없이 호출 시 실패하므로
    // 팝업 페이지를 새 탭으로 열어 대체
    chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html") });
    return false;
  }

  if (message.action === "openAI") {
    const q = encodeURIComponent(message.text);
    const urls = {
      chatgpt: `https://chatgpt.com/?q=${q}`,
      perplexity: `https://www.perplexity.ai/search?q=${q}`,
      claude: `https://claude.ai/new?q=${q}`,
      gemini: `https://gemini.google.com/app?q=${q}`,
      grok: `https://grok.com/?q=${q}`,
    };
    const url = urls[message.service];
    if (url) chrome.tabs.create({ url });
    return false;
  }
});

async function getApiKey() {
  const data = await chrome.storage.sync.get("openai_api_key");
  return data.openai_api_key || null;
}

async function callOpenAI(prompt, maxTokens) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { success: false, error: "API Key가 설정되지 않았습니다. 익스텐션 아이콘을 클릭하여 API Key를 입력해주세요." };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        tools: [{ type: "web_search" }],
        instructions:
          "너는 정확한 사실만 전달하는 사전형 도우미야. 규칙: 1) 잘 모르는 내용은 반드시 웹 검색을 활용해서 정확한 정보를 찾아 답변해. 2) 추측하거나 지어내지 마. 3) 한국어로 답변해.",
        input: prompt,
        temperature: 0,
        max_output_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `API 오류 (${response.status})`;
      return { success: false, error: msg };
    }

    const data = await response.json();
    const textOutput = data.output.find((item) => item.type === "message");
    if (!textOutput) {
      return { success: false, error: "응답을 가져올 수 없습니다." };
    }

    const outputTexts = textOutput.content?.filter((c) => c.type === "output_text") || [];
    let result = outputTexts.map((c) => c.text).join("").trim();

    // url_citation 어노테이션에서 링크 추출
    const citations = [];
    for (const c of outputTexts) {
      if (c.annotations) {
        for (const ann of c.annotations) {
          if (ann.type === "url_citation" && ann.url) {
            citations.push({ title: ann.title || ann.url, url: ann.url });
          }
        }
      }
    }

    // 응답 텍스트에서 인라인 인용 마크업 제거 (예: ([title](url)) )
    result = result.replace(/\s*\(\[.*?\]\(https?:\/\/[^)]+\)\)/g, "");
    result = result.replace(/\s*\[.*?\]\(https?:\/\/[^)]+\)/g, "");
    result = result.trim();

    if (!result) {
      return { success: false, error: "응답을 가져올 수 없습니다." };
    }

    return { success: true, result, citations };
  } catch (err) {
    return { success: false, error: `네트워크 오류: ${err.message}` };
  }
}

async function handleOneLiner(text) {
  return callOpenAI(
    `다음 문구/단어를 한 줄(1문장)로 간결하게 설명해줘: "${text}"`,
    60
  );
}

async function handleDetailed(text) {
  return callOpenAI(
    `다음 문구/단어를 3~4줄로 자세히 설명해줘: "${text}"`,
    400
  );
}
