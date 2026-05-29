const API_BASE = "http://198.105.113.144:5000/api";

// 1. Poll the API for new prompts every 2 seconds
setInterval(async () => {
    try {
        const res = await fetch(`${API_BASE}/prompt`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.prompt && data.prompt.trim() !== "") {
                console.log("[StreamInsight Background] Received prompt from Python API:", data.prompt);
                
                // Find ChatGPT tab and send the prompt to it
                chrome.tabs.query({ url: "*://*.chatgpt.com/*" }, (tabs) => {
                    if (tabs.length > 0) {
                        let targetTab = tabs.find(t => t.active) || tabs[0];
                        chrome.tabs.sendMessage(targetTab.id, { type: "TRIGGER_PROMPT", text: data.prompt });
                    }
                });
            }
        }
    } catch (e) {
        // API probably not running, ignore
    }
}, 2000);

// 2. Listen for results from content script and forward to Python API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "API_SEND_RESULT") {
        const payload = {};
        if (message.text) payload.text = message.text;
        if (message.image) payload.image_url = message.image;

        fetch(`${API_BASE}/result`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(res => {
            console.log("[StreamInsight Background] Sent result to Python API successfully");
        }).catch(e => {
            console.error("[StreamInsight Background] Failed to send result to Python API:", e);
        });
    }
});
