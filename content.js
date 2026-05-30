
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
(document.head || document.documentElement).appendChild(script);

console.log("[StreamInsight] Content script initialized");

let floatingBox = null;
let isMinimized = false;

function createFloatingBox() {
    if (floatingBox) return floatingBox;

    floatingBox = document.createElement("div");
    floatingBox.id = "stream-capture-floating-box";
    floatingBox.innerHTML = `
        <div class="header">
            <span class="title">Live Stream Capture</span>
            <div class="controls">
                <button class="min-btn">_</button>
                <button class="close-btn">&times;</button>
            </div>
        </div>
        <div class="content">Waiting for stream tokens...</div>
        <div class="input-area">
            <input type="text" id="stream-capture-input" placeholder="Ask ChatGPT anything..." autocomplete="off" />
            <button id="stream-capture-send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
        #stream-capture-floating-box {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: rgba(10, 10, 12, 0.98);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 12px;
            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.8);
            color: #eee;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        #stream-capture-floating-box .header {
            padding: 10px 15px;
            background: rgba(0, 255, 136, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        #stream-capture-floating-box .title {
            font-weight: bold;
            font-size: 12px;
            color: #00ff88;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        #stream-capture-floating-box .content {
            padding: 15px;
            font-size: 13px;
            line-height: 1.5;
            overflow-y: auto;
            word-break: break-word;
            flex-grow: 1;
            max-height: 400px;
        }
        #stream-capture-floating-box .input-area {
            display: flex;
            padding: 10px;
            background: rgba(0,0,0,0.4);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            gap: 8px;
            align-items: center;
        }
        #stream-capture-floating-box .input-area input {
            flex-grow: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 8px 15px;
            color: #fff;
            outline: none;
            font-size: 13px;
        }
        #stream-capture-floating-box .input-area input:focus {
            border-color: #00ff88;
        }
        #stream-capture-floating-box .input-area button#stream-capture-send {
            background: #00ff88;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000;
            transition: all 0.2s;
        }
        #stream-capture-floating-box .input-area button#stream-capture-send:hover {
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(0,255,136,0.4);
        }
        #stream-capture-floating-box .media-container {
            padding: 10px 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: rgba(0, 0, 0, 0.2);
        }
        #stream-capture-floating-box iframe {
            width: 100%;
            height: 150px;
            border: none;
            border-radius: 8px;
            background: #fff;
        }
        #stream-capture-floating-box .media-link {
            color: #00ff88;
            font-size: 12px;
            text-decoration: none;
            word-break: break-all;
        }
        #stream-capture-floating-box .media-link:hover {
            text-decoration: underline;
        }
        #stream-capture-floating-box .content h1, 
        #stream-capture-floating-box .content h2, 
        #stream-capture-floating-box .content h3 { 
            color: #00ff88; 
            margin: 10px 0 5px 0; 
            font-size: 14px;
        }
        #stream-capture-floating-box .content pre {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
            border: 1px solid rgba(255,255,255,0.05);
        }
        #stream-capture-floating-box .content code {
            font-family: 'Consolas', monospace;
            background: rgba(255,255,255,0.1);
            padding: 2px 4px;
            border-radius: 3px;
            color: #ff79c6;
        }
        #stream-capture-floating-box .content pre code {
            background: none;
            padding: 0;
            color: #bd93f9;
        }
        #stream-capture-floating-box .content ul,
        #stream-capture-floating-box .content ol {
            padding-left: 20px;
            margin: 10px 0;
        }

        #stream-capture-floating-box .controls button {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 16px;
            margin-left: 5px;
        }
        #stream-capture-floating-box.minimized {
            height: 40px;
            width: 220px;
        }
        #stream-capture-floating-box.minimized .content,
        #stream-capture-floating-box.minimized .input-area,
        #stream-capture-floating-box.minimized .media-container {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(floatingBox);

    const toggleMin = () => {
        isMinimized = !isMinimized;
        floatingBox.classList.toggle("minimized", isMinimized);
        floatingBox.querySelector(".min-btn").textContent = isMinimized ? "□" : "_";
    };
    
    floatingBox.querySelector(".header").addEventListener("click", toggleMin);
    floatingBox.querySelector(".close-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        floatingBox.remove();
        floatingBox = null;
    });

    // Handle remote input logic
    const inputField = floatingBox.querySelector("#stream-capture-input");
    const sendBtn = floatingBox.querySelector("#stream-capture-send");

    const triggerChatGPT = () => {
        const text = inputField.value.trim();
        if (!text) return;
        
        const chatInput = document.getElementById("prompt-textarea");
        if (chatInput) {
            chatInput.focus();
            
            // Insert text using execCommand which works best with contenteditable/ProseMirror
            document.execCommand('insertText', false, text);
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait a tiny bit for React state to update the send button
            setTimeout(() => {
                const chatSendBtn = document.querySelector('[data-testid="send-button"]');
                if (chatSendBtn && !chatSendBtn.disabled) {
                    chatSendBtn.click();
                } else {
                    // Fallback: simulate Enter key
                    const enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13
                    });
                    chatInput.dispatchEvent(enterEvent);
                }
                inputField.value = "";
            }, 150);
        } else {
            console.error("[StreamInsight] Could not find #prompt-textarea on the page");
        }
    };

    sendBtn.addEventListener("click", triggerChatGPT);
    inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            triggerChatGPT();
        }
    });

    return floatingBox;
}

window.addEventListener("message", (event) => {
    if (event.data.type === "STREAM_CAPTURE") {
        const { text, url } = event.data;
        
        chrome.storage.local.set({ streamText: text, streamUrl: url });

        const box = createFloatingBox();
        box.style.display = "flex";
        const content = box.querySelector(".content");
        
        // Render markdown in the floating box too
        if (window.marked) {
            content.innerHTML = marked.parse(text);
        } else {
            content.textContent = text;
        }
        
        content.scrollTop = content.scrollHeight;

        // Scan the markdown stream for estuary/content URLs
        const estuaryRegex = /https:\/\/chatgpt\.com\/backend-api\/estuary\/content\?id=[^\s\)"'\]]+/g;
        const matches = text.match(estuaryRegex);
        if (matches && matches.length > 0) {
            const estuaryUrl = matches[matches.length - 1]; // get the latest one
            
            let mediaContainer = box.querySelector(".media-container");
            if (!mediaContainer) {
                mediaContainer = document.createElement("div");
                mediaContainer.className = "media-container";
                box.appendChild(mediaContainer);
            }
            
            // Update only if it's a new URL
            if (mediaContainer.dataset.url !== estuaryUrl) {
                mediaContainer.dataset.url = estuaryUrl;
                mediaContainer.style.display = "flex";
                
                const link = document.createElement("a");
                link.href = estuaryUrl;
                link.target = "_blank";
                link.className = "media-link";
                link.textContent = "Open Generated Content: " + estuaryUrl.substring(0, 35) + "...";
                
                const iframe = document.createElement("iframe");
                iframe.src = estuaryUrl;
                
                mediaContainer.innerHTML = '';
                mediaContainer.appendChild(link);
                mediaContainer.appendChild(iframe);
            }
        }

    } else if (event.data.type === "ESTUARY_IMAGE") {
        const url = event.data.url;
        
        const box = createFloatingBox();
        box.style.display = "flex";
        
        let mediaContainer = box.querySelector(".media-container");
        if (!mediaContainer) {
            mediaContainer = document.createElement("div");
            mediaContainer.className = "media-container";
            box.appendChild(mediaContainer);
        }
        
        mediaContainer.style.display = "flex";
        
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.className = "media-link";
        link.textContent = "Open Generated Content: " + url.substring(0, 30) + "...";
        
        const iframe = document.createElement("iframe");
        iframe.src = url;
        
        mediaContainer.innerHTML = '';
        mediaContainer.appendChild(link);
        mediaContainer.appendChild(iframe);
        
        // Fetch image as blob and send base64 to Python API so it can host it publicly
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    chrome.runtime.sendMessage({ type: "API_SEND_RESULT", image: url, image_data: reader.result });
                };
                reader.readAsDataURL(blob);
            }).catch(e => {
                // Fallback to just URL if fetch fails
                chrome.runtime.sendMessage({ type: "API_SEND_RESULT", image: url });
            });

    } else if (event.data.type === "STREAM_DONE") {
        // When stream finishes, send the final text to background script for Python API
        chrome.storage.local.get("streamText", (data) => {
            if (data.streamText) {
                chrome.runtime.sendMessage({ type: "API_SEND_RESULT", text: data.streamText });
            }
        });
    }
});

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TRIGGER_PROMPT") {
        const text = message.text;
        const chatInput = document.getElementById("prompt-textarea");
        if (chatInput) {
            chatInput.focus();
            document.execCommand('insertText', false, text);
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                const chatSendBtn = document.querySelector('[data-testid="send-button"]');
                if (chatSendBtn && !chatSendBtn.disabled) {
                    chatSendBtn.click();
                } else {
                    const enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13
                    });
                    chatInput.dispatchEvent(enterEvent);
                }
            }, 150);
            sendResponse({ success: true });
        } else {
            console.error("[StreamInsight] Could not find #prompt-textarea on the page");
            sendResponse({ success: false });
        }
    }
    return true;
});

// Ping the background script every 2 seconds to keep the Service Worker awake
// and force it to check the Python API for new prompts.
setInterval(() => {
    chrome.runtime.sendMessage({ type: "PING_POLL" }, (response) => {
        // Ignored, just keeping the connection alive and triggering the poll
    });
}, 2000);




