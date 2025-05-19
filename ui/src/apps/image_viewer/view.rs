use crate::{views::FileDropArea, AppViewProps, BLOB_MANAGER};
use dioxus::{logger::tracing, prelude::*};

pub(super) fn VView(props: AppViewProps) -> Element {
    let id = props.id;
    let initial_data = props.initial_data;

    let mut src = use_signal(|| String::new());

    use_hook(|| {
        spawn(async move {
            if let Some(resource_id) = initial_data {
                let mut mgr = BLOB_MANAGER.write();
                let url = mgr.get(resource_id).await;
                src.set(url);
            }
        });
    });

    let on_read = move |(name, data): (String, Vec<u8>)| {
        spawn(async move {
            let mut mgr = BLOB_MANAGER.write();
            let url = mgr.allocate(data).await;
            src.set(url);
        });
    };

    let src = src.read().clone();

    if src.is_empty() {
        rsx! {
            FileDropArea {
                id,
                on_read,
            }
        }
    } else {
        rsx! {
            div {
                class: "flex justify-center items-center p-4 w-full h-full",
                img {
                    class: "object-contain shadow-sm",
                    src,
                }
            }
        }
    }
}
