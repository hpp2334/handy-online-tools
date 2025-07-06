#!/usr/bin/env python3

import subprocess
import os

from base import proto_path, flutter_generated_path, root_path

if not os.path.exists(flutter_generated_path):
    os.makedirs(flutter_generated_path)


proto_files = [os.path.join(proto_path, f) for f in os.listdir(proto_path) if f.endswith('.proto')]
subprocess.run(["protoc", f"-I={root_path}", f"--dart_out={flutter_generated_path}", *proto_files], cwd=root_path)

# dart pub global activate protoc_plugin
# export PATH="$PATH":"$HOME/.pub-cache/bin"
# export PROTOC="$HOME/Documents/Application/protobuf/bin/protoc
# export PATH="$HOME/Documents/Application/protobuf/bin:$PATH"