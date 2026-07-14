import io
import os
import zipfile

from flask import Flask, request, send_file, send_from_directory
from werkzeug.exceptions import NotFound, RequestEntityTooLarge
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')), static_url_path='')

DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB per request


def _sniff_image_type(data):
    """Minimal magic-byte check for the allowed raster formats.

    The stdlib `imghdr` module (used in earlier drafts of this feature) was
    removed in Python 3.13 (PEP 594), so signatures are checked directly
    instead of adding a third-party dependency for this narrow allowlist.
    """
    if data.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if data.startswith((b'GIF87a', b'GIF89a')):
        return 'gif'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    return None


def _looks_like_svg(data):
    # SVG is XML text, not a binary format with magic bytes. This is a
    # lightweight sanity check (not a full parse) that content mislabeled
    # with a .svg extension doesn't slip through as some unrelated binary.
    snippet = data[:2048].lstrip().lower()
    return b'<svg' in snippet or b'<?xml' in snippet


@app.errorhandler(RequestEntityTooLarge)
def handle_large_upload(_e):
    return {'error': 'Upload too large (16 MB limit)'}, 413


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


@app.post('/api/export')
def export_zip():
    markdown = request.form.get('markdown', '')
    slug = secure_filename(request.form.get('slug') or '') or 'blog-post'
    images = request.files.getlist('images')

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('post.md', markdown)

        used_names = set()
        for image in images:
            if not image.filename:
                continue

            ext = image.filename.rsplit('.', 1)[-1].lower() if '.' in image.filename else ''
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                return {'error': f'Invalid file type: .{ext}' if ext else 'Invalid file type'}, 400

            data = image.read()
            if not data:
                return {'error': f'Empty file: {image.filename}'}, 400

            content_ok = _looks_like_svg(data) if ext == 'svg' else _sniff_image_type(data) is not None
            if not content_ok:
                return {'error': f'File content does not match image type: {image.filename}'}, 400

            safe_name = secure_filename(image.filename)
            if not safe_name:
                return {'error': f'Invalid filename: {image.filename}'}, 400

            # Guard against two uploads sanitizing to the same name, which
            # would otherwise silently overwrite an entry in the zip.
            final_name = safe_name
            n = 1
            while final_name in used_names:
                stem, dot, tail = safe_name.rpartition('.')
                final_name = f'{stem}-{n}.{tail}' if dot else f'{safe_name}-{n}'
                n += 1
            used_names.add(final_name)

            zf.writestr(final_name, data)

    buf.seek(0)
    return send_file(
        buf,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{slug}.zip',
    )


@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except NotFound:
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=DEBUG, port=5000)
