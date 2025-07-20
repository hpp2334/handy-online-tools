
import subprocess
import os

from base import proto_path, flutter_generated_path, root_path, rust_libs_core_path


def build_proto():
    print("Start to build proto")
    if not os.path.exists(flutter_generated_path):
        os.makedirs(flutter_generated_path)

    proto_files = [os.path.join(proto_path, f) for f in os.listdir(proto_path) if f.endswith('.proto')]
    subprocess.run(["protoc", f"-I={root_path}", f"--dart_out={flutter_generated_path}", *proto_files], cwd=root_path, check=True)


def build_wasm():
    print("Start to build wasm")
    subprocess.run(["wasm-pack", "build", "--out-dir", root_path.joinpath("web/pkg"), "--target", "web"], cwd=rust_libs_core_path, check=True)

def build_flutter_web():
    print("Start to build flutter web")
    subprocess.run(["flutter", "build", "web"], cwd=root_path, check=True)