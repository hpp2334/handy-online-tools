use std::collections::HashMap;
use std::io::Cursor;
use std::sync::Arc;
use zip::ZipArchive;

#[derive(Debug, Clone, PartialEq)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: HashMap<String, FileEntry>,
}

#[derive(Debug)]
pub struct Archiver {
    zip_archive: Option<ZipArchive<Cursor<Vec<u8>>>>,
    root_entry: Option<FileEntry>,
}

impl Archiver {
    pub fn new() -> Self {
        Archiver {
            zip_archive: None,
            root_entry: None,
        }
    }

    pub fn load_zip(&mut self, bytes: Vec<u8>) -> Result<(), String> {
        let cursor = Cursor::new(bytes);
        match ZipArchive::new(cursor) {
            Ok(archive) => {
                self.zip_archive = Some(archive);
                self.build_file_tree();
                Ok(())
            }
            Err(e) => Err(format!("Error loading zip archive: {}", e)),
        }
    }

    fn build_file_tree(&mut self) {
        if let Some(archive) = &mut self.zip_archive {
            let mut root = FileEntry {
                name: "/".to_string(),
                path: "/".to_string(),
                is_dir: true,
                children: HashMap::new(),
            };

            for i in 0..archive.len() {
                if let Ok(file) = archive.by_index(i) {
                    let path_components: Vec<&str> = file.name().split('/').collect();
                    let mut current_dir = &mut root;

                    for (j, component) in path_components.iter().enumerate() {
                        if component.is_empty() {
                            continue;
                        }

                        let is_last_component = j == path_components.len() - 1;
                        let is_dir = if is_last_component {
                            file.is_dir()
                        } else {
                            true
                        };

                        current_dir = current_dir
                            .children
                            .entry(component.to_string())
                            .or_insert_with(|| FileEntry {
                                name: component.to_string(),
                                path: if current_dir.path == "/" {
                                    format!("/{}", component)
                                } else {
                                    format!("{}/{}", current_dir.path, component)
                                },
                                is_dir,
                                children: HashMap::new(),
                            });
                    }
                }
            }
            self.root_entry = Some(root);
        }
    }

    pub fn get_root_entry(&self) -> Option<&FileEntry> {
        self.root_entry.as_ref()
    }
}
