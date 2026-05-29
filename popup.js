
const output = document.getElementById("output");
const urlDiv = document.getElementById("url");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusText = document.querySelector(".status span");
let lastText = "";

function refresh() {
    chrome.storage.local.get(["streamText", "streamUrl"], (data) => {
        updateUI(data.streamText, data.streamUrl);
    });
}

function updateUI(text, url) {
    if (text) {
        if (text !== lastText) {
            output.innerHTML = marked.parse(text);
            output.scrollTop = output.scrollHeight;
            lastText = text;
            
            const now = new Date();
            statusText.textContent = `Live updating • ${now.toLocaleTimeString()}`;
        }
    } else {
        output.innerHTML = "No stream captured yet.";
        lastText = "";
        statusText.textContent = "Listening for SSE events...";
    }

    if (url) {
        urlDiv.textContent = url;
    } else {
        urlDiv.textContent = "Waiting for stream...";
    }
}

// Listen for storage changes in real-time
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        const newText = changes.streamText ? (changes.streamText.newValue || "") : lastText;
        const newUrl = changes.streamUrl ? (changes.streamUrl.newValue || "") : urlDiv.textContent;
        updateUI(newText, newUrl);
    }
});

copyBtn.addEventListener("click", () => {
    const text = output.innerText; // Use innerText for markdown-rendered text
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

clearBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["streamText", "streamUrl"], () => {
        refresh();
    });
});

// Initial load
refresh();

// Remote Prompt Logic
const popupInput = document.getElementById("popup-input");
const popupSend = document.getElementById("popup-send");

function triggerRemotePrompt() {
    const text = popupInput.value.trim();
    if (!text) return;

    chrome.tabs.query({ url: "*://*.chatgpt.com/*" }, (tabs) => {
        if (tabs.length > 0) {
            // Prefer the active tab if it's chatgpt, else pick the first chatgpt tab
            let targetTab = tabs.find(t => t.active) || tabs[0];
            
            chrome.tabs.sendMessage(targetTab.id, { type: "TRIGGER_PROMPT", text: text }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error: Please refresh the ChatGPT page.");
                    alert("Please refresh your ChatGPT tab and try again.");
                } else {
                    popupInput.value = "";
                }
            });
        } else {
            alert("No ChatGPT tab found. Please open chatgpt.com first.");
        }
    });
}

popupSend.addEventListener("click", triggerRemotePrompt);
popupInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerRemotePrompt();
});



