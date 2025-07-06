use std::io::Result;

fn main() -> Result<()> {
    let proto_dir = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("../../proto")
        .canonicalize()
        .unwrap();
    let include_dir = proto_dir.parent().unwrap();
    let protos: Vec<_> = std::fs::read_dir(proto_dir.as_path())?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension().map_or(false, |ext| ext == "proto") {
                Some(path.canonicalize().ok()?)
            } else {
                None
            }
        })
        .collect();
    prost_build::compile_protos(protos.as_slice(), &[include_dir])?;

    println!("cargo:rerun-if-changed=../../proto/core.proto");
    println!("cargo:rerun-if-changed=../../proto/archiver.proto");

    Ok(())
}
