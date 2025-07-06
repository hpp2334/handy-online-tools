from pathlib import Path

root_path = Path(__file__).resolve().parent.parent
rust_libs_path = root_path.joinpath("rust-libs")
rust_libs_core_path = root_path.joinpath("rust-libs").joinpath("hol_core")
flutter_path = root_path.joinpath("lib")
flutter_generated_path = flutter_path.joinpath("generated")
proto_path = root_path.joinpath("proto")
