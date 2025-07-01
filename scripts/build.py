#!/usr/bin/env python3

from pathlib import Path
import subprocess

root_path = Path(__file__).resolve().parent.parent
rust_libs_path = root_path.joinpath("rust-libs")

subprocess.run(["wasm-pack", "build", "--out-dir", root_path.joinpath("web/pkg")], cwd=rust_libs_path)