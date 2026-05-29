import os
import time
import subprocess
import threading
import base64
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow extension to make requests

# Create temp directory for images
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
os.makedirs(TEMP_DIR, exist_ok=True)

# State variables
current_prompt = None
latest_result = None

def schedule_deletion(filepath, delay=900):
    """Deletes a file after a specified delay in seconds (default 15 mins)"""
    def delete_task():
        time.sleep(delay)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                print(f"[System] Deleted temp file: {filepath}")
            except Exception as e:
                print(f"[System] Failed to delete file: {e}")
    
    threading.Thread(target=delete_task, daemon=True).start()

@app.route('/temp/<path:filename>')
def serve_temp_file(filename):
    return send_from_directory(TEMP_DIR, filename)

@app.route('/api/prompt', methods=['GET'])
def get_prompt():
    global current_prompt
    if current_prompt:
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
    print(f"\n[API] Received Result from ChatGPT Extension!")
    
    # Process image data if available
    if 'image_data' in data:
        try:
            # Extract base64 part (data:image/png;base64,iVBORw0KGgo...)
            header, encoded = data['image_data'].split(',', 1)
            file_ext = 'png'
            if 'jpeg' in header: file_ext = 'jpg'
            elif 'webp' in header: file_ext = 'webp'
            
            filename = f"img_{uuid.uuid4().hex}.{file_ext}"
            filepath = os.path.join(TEMP_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(encoded))
            
            # Replace the private image_url with our public hosted URL
            public_url = f"http://198.105.113.144:5000/temp/{filename}"
            data['image_url'] = public_url
            del data['image_data'] # Don't need to keep the huge base64 string in memory
            
            print(f"Saved Image Locally: {filepath}")
            print(f"Public URL (Self-Destructs in 15m): {public_url}")
            
            # Schedule deletion in 15 minutes (900 seconds)
            schedule_deletion(filepath, 900)
        except Exception as e:
            print(f"Failed to process image data: {e}")
    
    latest_result = data
    if 'text' in data:
        print(f"Text Preview: {data['text'][:100]}...")
    if 'image_url' in data:
        print(f"Image URL: {data['image_url']}")
    
    return jsonify({"status": "success"})

@app.route('/api/result', methods=['GET'])
def check_result():
    global latest_result
    if latest_result:
        # Give the result to the frontend and clear it
        res = latest_result
        latest_result = None
        return jsonify(res)
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
