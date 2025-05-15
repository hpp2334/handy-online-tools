use crate::{AppViewProps, AppWindowId, APP_WINDOW_MANAGER};

use super::core::{Archiver, FileEntry};
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
    entry: FileEntry,
}
pub fn VFileEntry(VFileEntryProps { entry }: VFileEntryProps) -> Element {
    // Initial expansion only for the root or directory entry with children
    let mut expanded = use_signal(|| entry.path == "/".to_string());

    let toggle_expanded = move |_| {
        if entry.is_dir {
            expanded.set(!expanded());
        }
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
                        VFileEntry { entry: child }
                    }
                }
            }
        }
    } else {
        rsx! {
            div {
                class: "ml-8",
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

#[derive(Props, PartialEq, Eq, Clone)]
struct FileDropAreaProps {
    id: AppWindowId,
    archiver: Signal<Archiver>,
    error_message: Signal<Option<String>>,
}

fn FileDropArea(props: FileDropAreaProps) -> Element {
    let id = props.id;
    let archiver = props.archiver;
    let error_message = props.error_message;

    let mut is_dragging = use_signal(|| false);

    let handle_drag_enter = move |event: DragEvent| {
        event.stop_propagation();
        event.prevent_default();
    };

    let handle_drag_over = move |event: DragEvent| {
        event.stop_propagation();
        event.prevent_default();

        is_dragging.set(true);
    };

    let handle_drag_leave = move |_| {
        is_dragging.set(false);
    };

    let handle_drop = move |event: DragEvent| {
        event.stop_propagation();
        event.prevent_default();

        is_dragging.set(false);
        if let Some(file_engine) = &event.files() {
            if let Some(file_name) = file_engine.files().first() {
                handle_file(id, file_engine, file_name.as_str(), archiver, error_message);
            }
        }
    };

    let el = if *is_dragging.read() {
        rsx! {
             p {
                class: "text-lg text-gray-700",
                "Dragging"
            }
        }
    } else {
        rsx! {
            label {
                r#for: "file-upload",
                class: "font-bold py-2 px-4",
                "Drop file here"
            }
        }
    };

    rsx! {
        div {
            class: {
                let base = "flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded";
                if *is_dragging.read() { format!("{} border-blue-500 bg-blue-100", base) } else { format!("{} border-gray-300", base) }
            },
            ondrop: handle_drop,
            ondragenter: handle_drag_enter,
            ondragover: handle_drag_over,
            ondragleave: handle_drag_leave,

            {el}
        }
    }
}

pub fn VView(props: AppViewProps) -> Element {
    let id = props.id;

    let mut archiver = use_signal(|| Archiver::new());
    let mut error_message = use_signal(|| None::<String>);

    let child = if let Some(error) = &*error_message.read() {
        rsx! {
            div {
                class: "text-red-500 mt-4",
                "{error}"
            }
        }
    } else if let Some(root) = archiver.read().get_root_entry() {
        rsx! {
            div {
                class: "",
                VFileEntry { entry: root.clone() }
            }
        }
    } else {
        rsx! {
            FileDropArea { id, archiver, error_message }
        }
    };

    rsx! {
        div {
            class: "p-4 w-full h-full overflow-y-auto",

            {child}
        }
    }
}
