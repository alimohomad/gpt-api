import os
import time
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading

app = Flask(__name__)
CORS(app)  # Allow extension to make requests

# State variables
current_prompt = None
latest_result = None

@app.route('/api/prompt', methods=['GET'])
def get_prompt():
    global current_prompt
    if current_prompt:
        # Give the prompt to the extension, then clear it so we don't send it twice
        prompt_to_send = current_prompt
        current_prompt = None
        return jsonify({"prompt": prompt_to_send})
    
    return jsonify({"prompt": ""})

@app.route('/api/prompt', methods=['POST'])
def set_prompt():
    global current_prompt, latest_result
    data = request.json
    if not data or 'prompt' not in data:
        return jsonify({"error": "No prompt provided"}), 400
    
    current_prompt = data['prompt']
    latest_result = None # Clear previous result
    print(f"\n[API] New Prompt Queued for ChatGPT: {current_prompt}")
    return jsonify({"status": "success", "message": "Prompt queued"})

@app.route('/api/result', methods=['POST'])
def receive_result():
    global latest_result
    data = request.json
    latest_result = data
    print(f"\n[API] Received Result from ChatGPT Extension!")
    if 'text' in data:
        print(f"Text Preview: {data['text'][:100]}...")
    if 'image_url' in data:
        print(f"Image URL: {data['image_url']}")
    
    return jsonify({"status": "success"})

@app.route('/api/result', methods=['GET'])
def check_result():
    if latest_result:
        return jsonify(latest_result)
    return jsonify({"status": "waiting"})

def open_browser():
    # Wait a second for the Flask server to start
    time.sleep(1.5)
    print("\n[System] Opening Google Chrome to chatgpt.com...")
    try:
        # For Ubuntu/Linux, use google-chrome-stable
        subprocess.Popen(['google-chrome-stable', '--no-sandbox', 'https://chatgpt.com'])
    except Exception as e:
        print(f"Failed to open Google Chrome automatically: {e}")
        print("Please open Chrome manually and go to https://chatgpt.com")

if __name__ == '__main__':
    print("==================================================")
    print(" ChatGPT Headless Automation API Started")
    print("==================================================")
    print("1. Ensure your extension is loaded in Firefox.")
    print("2. Ensure you are logged into ChatGPT.")
    print("3. Send a POST request to http://localhost:5000/api/prompt to trigger generation.")
    print("4. Get results by polling GET http://localhost:5000/api/result")
    
    # Start browser in a background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000)
