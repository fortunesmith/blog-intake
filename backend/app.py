import os
from flask import Flask, send_from_directory
from werkzeug.exceptions import NotFound

app = Flask(__name__, static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')), static_url_path='')

DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except NotFound:
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=DEBUG, port=5000)
