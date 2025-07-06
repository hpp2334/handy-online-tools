#!/usr/bin/env python3

from pathlib import Path
import subprocess

from base import rust_libs_core_path, root_path

subprocess.run(["wasm-pack", "build", "--out-dir", root_path.joinpath("web/pkg"), "--target", "web"], cwd=rust_libs_core_path)