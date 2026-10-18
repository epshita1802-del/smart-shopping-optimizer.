import os
import sys

# Make the backend folder importable, then expose the Flask app as `app` for Vercel
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app import create_app  # noqa: E402

app = create_app()