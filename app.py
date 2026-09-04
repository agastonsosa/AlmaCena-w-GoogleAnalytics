"""Vercel's Flask entrypoint; the local development entrypoint remains src/app.py."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'src'))
from src.app import app
