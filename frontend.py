from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    print("==================================================")
    print(" AI Chat Interface starting on Port 80")
    print(" (Make sure to run with sudo if on Linux!)")
    print("==================================================")
    app.run(host='0.0.0.0', port=80)
