
(function () {
    const oldFetch = window.fetch;
    const oldXHR = window.XMLHttpRequest.prototype.open;

    function sendUpdate(text, url) {
        console.log("[StreamInsight] Sending update:", text.substring(0, 20) + "...");
        window.postMessage({
            type: "STREAM_CAPTURE",
            text,
            url
        }, "*");
    }

    // Overwrite Fetch
    window.fetch = async function (...args) {
        const response = await oldFetch.apply(this, args);
        let url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url ? args[0].url : "");

        if (!url.includes("chatgpt.com") && !url.includes("/conversation") && !url.includes("/estuary/content") && !url.includes("/files/")) return response;

        // Catch backend-api/files/.../download which returns JSON with download_url
        if (url.includes("/backend-api/files/") && url.includes("/download")) {
            try {
                const cloned = response.clone();
                cloned.json().then(data => {
                    const imageUrl = data.download_url || data.url || data.image_url || data.signed_url;
                    if (imageUrl) {
                        window.postMessage({
                            type: "ESTUARY_IMAGE",
                            url: imageUrl
                        }, "*");
                    }
                }).catch(e => {});
            } catch(e) {}
            return response;
        }

        // If the browser fetches the estuary URL directly, we can also catch it
        if (url.includes("/estuary/content?id=")) {
            window.postMessage({
                type: "ESTUARY_IMAGE",
                url: url
            }, "*");
            return response;
        }

        try {
            const cloned = response.clone();
            const reader = cloned.body.getReader();
            const decoder = new TextDecoder();
            let finalText = "";
            let buffer = "";

            (async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop();

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data: ")) {
                            const raw = trimmed.slice(6);
                            if (raw === "[DONE]") continue;
                            try {
                                const json = JSON.parse(raw);
                                handleJson(json);
                            } catch (e) {}
                        }
                    }
                }
            })();

            function handleJson(json) {
                // Case 1: ChatGPT delta format
                if (json.v && typeof json.v === "string") {
                    finalText += json.v;
                    sendUpdate(finalText, url);
                }
                // Case 2: ChatGPT patch format
                else if (Array.isArray(json.v)) {
                    json.v.forEach(item => {
                        if (item.o === "append" && typeof item.v === "string") {
                            finalText += item.v;
                        }
                    });
                    sendUpdate(finalText, url);
                }
                // Case 3: Standard OpenAI format
                else if (json.choices && json.choices[0]?.delta?.content) {
                    finalText += json.choices[0].delta.content;
                    sendUpdate(finalText, url);
                }
            }
        } catch (e) {}
        return response;
    };

    // Overwrite XHR (just in case)
    const oldSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function() {
        this.addEventListener("progress", (e) => {
            const url = this._url || "";
            if (url.includes("/conversation")) {
                const text = this.responseText;
                // XHR progress usually contains the full accumulated text
                // We'd need to parse SSE from it, but let's keep it simple for now
            }
        });
        return oldSend.apply(this, arguments);
    };

})();



