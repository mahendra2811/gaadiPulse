#!/usr/bin/env python3
"""Compatibility entrypoint: import updated supplied artwork, never recreate old silhouettes."""
from pathlib import Path
import subprocess

subprocess.run(["node", str(Path(__file__).with_name("generate-assets.mjs"))], check=True)
