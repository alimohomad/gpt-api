const API_BASE = "http://198.105.113.144:5000/api";

// Create an alarm to poll every 2 seconds (note: alarms in MV3 are typically restricted to 1 min, but we can combine it with a recursive timeout for active polling while awake)
function pollApi() {
    fetch(`${API_BASE}/prompt`)
        .then(res => res.json())
        .then(data => {
            if (data && data.prompt && data.prompt.trim() !== "") {
                console.log("[StreamInsight Background] Received prompt from Python API:", data.prompt);
                
                // Find ChatGPT tab and send the prompt to it
                chrome.tabs.query({}, (tabs) => {
                    let chatgptTabs = tabs.filter(t => t.url && t.url.includes("chatgpt.com"));
                    if (chatgptTabs.length > 0) {
                        let targetTab = chatgptTabs.find(t => t.active) || chatgptTabs[0];
                        chrome.tabs.sendMessage(targetTab.id, { type: "TRIGGER_PROMPT", text: data.prompt });
                    }
                });
            }
        })
        .catch(e => {
            // API probably not running, ignore
        })
        .finally(() => {
            // Schedule the next poll
            setTimeout(pollApi, 2000);
        });
}

// Start polling
pollApi();

// Keep service worker alive by listening to messages
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
    return true; // Keep message channel open if needed
});


