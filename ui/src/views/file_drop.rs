use crate::AppWindowId;
use std::sync::Arc;

use dioxus::html::{FileEngine, HasFileData};
use dioxus::prelude::*;

fn handle_file(
    id: AppWindowId,
    file_engine: &Arc<dyn FileEngine + 'static>,
    name: &str,
    on_read: EventHandler<(String, Vec<u8>)>,
) {
    let file_engine = file_engine.clone();
    let name = name.to_string();

    spawn(async move {
        match file_engine.read_file(name.as_str()).await {
            Some(bytes) => {
                on_read.call((name, bytes));
            }
            None => {}
        }
    });
}

#[derive(PartialEq, Props, Clone)]
pub struct FileDropAreaProps {
    id: AppWindowId,
    on_read: EventHandler<(String, Vec<u8>)>,
}

pub fn FileDropArea(props: FileDropAreaProps) -> Element {
    let id = props.id;
    let on_read = props.on_read;

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
                handle_file(id, file_engine, file_name.as_str(), on_read);
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
