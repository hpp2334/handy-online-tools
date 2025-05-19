use super::resource::ResourceId;
use dioxus::{document::Eval, logger::tracing, prelude::*};
use futures::channel::{mpsc, oneshot};
use std::collections::HashMap;

use super::RESOURCE_MANAGER;

pub struct BlobManager {
    blobs: HashMap<ResourceId, String>,
}

pub static BLOB_MANAGER: GlobalSignal<BlobManager> = Global::new(|| BlobManager::new());

impl BlobManager {
    pub fn new() -> Self {
        BlobManager {
            blobs: HashMap::new(),
        }
    }

    pub async fn allocate(&mut self, data: Vec<u8>) -> String {
        let mut res_mgr = RESOURCE_MANAGER.write();

        let id = res_mgr.allocate(data);
        drop(res_mgr);
        let url = self.get(id).await;

        self.blobs.insert(id, url.clone());
        url
    }

    pub async fn get(&mut self, id: ResourceId) -> String {
        if self.blobs.contains_key(&id) {
            return self.blobs.get(&id).unwrap().clone();
        }

        let mut res_mgr = RESOURCE_MANAGER.write();
        let data = res_mgr.get(id).to_vec();
        drop(res_mgr);

        let mut runner = document::eval(
            r#"
                const _value = await dioxus.recv();
                const value = new Uint8Array(_value);
                const url = URL.createObjectURL(new Blob([value]));
                dioxus.send(url);
        "#,
        );
        runner.send(data).unwrap();
        let resp = runner.recv::<String>().await;
        resp.unwrap()
    }
}
