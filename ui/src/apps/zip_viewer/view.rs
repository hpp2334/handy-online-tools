use crate::{
    AppViewProps, AppWindowId, Point, APP_MANAGER, APP_WINDOW_MANAGER, BLOB_MANAGER,
    RESOURCE_MANAGER,
};

use super::core::{Archiver, FileEntry};
use crate::views::FileDropArea;
use dioxus::html::{FileEngine, HasFileData};
use dioxus::logger::tracing;
use dioxus::prelude::*;
use std::collections::HashMap;
use std::io::Cursor;
use std::string::String;
use std::sync::Arc;
use zip::ZipArchive;

#[derive(Props, Clone, PartialEq)]
struct VFileEntryProps {
    archiver: Signal<Archiver>,
    entry: FileEntry,
}
pub fn VFileEntry(
    VFileEntryProps {
        mut archiver,
        entry,
    }: VFileEntryProps,
) -> Element {
    let file_path = entry.path.clone();
    let mut expanded = use_signal(|| entry.path == "/".to_string());

    let toggle_expanded = move |_| {
        if entry.is_dir {
            expanded.set(!expanded());
        }
    };

    let handle_entry_click = move |_| {
        let mut res_mgr = RESOURCE_MANAGER.write();
        let data = archiver
            .write()
            .read_file_by_path(file_path.as_str())
            .unwrap();
        let res_id = res_mgr.allocate(data);

        let extension = ".".to_string() + file_path.split(".").last().unwrap_or("bin");

        spawn(async move {
            let app_id = APP_MANAGER.read().select_default(extension.as_str());

            if let Some(app_id) = app_id {
                APP_WINDOW_MANAGER
                    .write()
                    .create(app_id, Point::new(20.0, 20.0), Some(res_id));
            }
        });
    };

    if entry.is_dir {
        let mut sorted_children: Vec<_> = entry.children.values().cloned().collect();
        sorted_children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        });

        let expanded = *expanded.read();

        rsx! {
            div {
                class: "ml-4",
                div {
                    class: "cursor-pointer flex items-center",
                    onclick: toggle_expanded,
                    div {
                        class: "w-4 text-center",
                        if expanded { "-" } else { "+" }
                    }
                    span {
                        class: "ml-1",
                        "{entry.name}"
                    }
                }
                if expanded {
                    for child in sorted_children {
                        VFileEntry { archiver, entry: child }
                    }
                }
            }
        }
    } else {
        rsx! {
            div {
                class: "ml-8",
                onclick: handle_entry_click,
                span {
                    "{entry.name}"
                }
            }
        }
    }
}

fn handle_file(
    id: AppWindowId,
    file_engine: &Arc<dyn FileEngine + 'static>,
    name: &str,
    mut archiver: Signal<Archiver>,
    mut error_message: Signal<Option<String>>,
) {
    let file_engine = file_engine.clone();
    let name = name.to_string();

    error_message.set(None);
    spawn(async move {
        match file_engine.read_file(name.as_str()).await {
            Some(bytes) => {
                if let Err(e) = archiver.write().load_zip(bytes) {
                    error_message.set(Some(e));
                } else {
                    APP_WINDOW_MANAGER.write().set_title(id, name);
                }
            }
            None => {
                error_message.set(Some(format!("Error reading file")));
            }
        }
    });
}

pub(super) fn VView(props: AppViewProps) -> Element {
    let id = props.id;

    let mut archiver = use_signal(|| Archiver::new());
    let mut error_message = use_signal(|| None::<String>);

    let on_read = move |(name, bytes): (String, Vec<u8>)| {
        error_message.set(None);
        if let Err(e) = archiver.write().load_zip(bytes) {
            error_message.set(Some(e));
        } else {
            APP_WINDOW_MANAGER.write().set_title(id, name);
        }
    };

    let error_message = error_message.read();

    if let Some(error) = error_message.clone() {
        rsx! {
            div {
                class: "text-red-500 mt-4",
                "{error}"
            }
        }
    } else if let Some(root) = archiver.read().get_root_entry() {
        rsx! {
            div {
                class: "p-4 w-full h-full overflow-y-auto",
                VFileEntry { archiver, entry: root.clone() }
            }
        }
    } else {
        rsx! {
            FileDropArea { id, on_read }
        }
    }
}
