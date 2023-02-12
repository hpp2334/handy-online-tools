use std::{
    collections::HashMap,
    sync::{atomic::AtomicI32, Mutex},
};

use once_cell::sync::Lazy;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

#[derive(Debug, Serialize, Deserialize, Hash, PartialEq, Eq)]
#[wasm_bindgen]
pub enum BridgeCode {
    BatchDigest,
}

pub trait BridgeCall {
    const CODE: i32;
    type Arg: DeserializeOwned + Serialize + Send + Sync + 'static;
    type Ret: Serialize + Send + Sync + 'static;
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = _Bridge)]
    pub fn send_ret(code: i32, ret: JsValue, call_id: i32);

    #[wasm_bindgen(js_namespace = _Bridge)]
    pub fn build_file_stream(blob_id: i32) -> i32;

    #[wasm_bindgen(js_namespace = _Bridge)]
    pub fn next_file_chunk(stream_id: i32) -> Option<Box<[u8]>>;
}

#[cfg(target_arch = "wasm32")]
pub struct BridgeFileStream {
    stream_id: i32,
}

#[cfg(target_arch = "wasm32")]
impl BridgeFileStream {
    pub fn new(blob_id: i32) -> Self {
        Self {
            stream_id: build_file_stream(blob_id),
        }
    }

    pub fn next(&mut self) -> Option<Box<[u8]>> {
        next_file_chunk(self.stream_id)
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub struct BridgeFileStream {
    stream_id: i32,
    has_read: bool,
}
#[cfg(not(target_arch = "wasm32"))]
static BLOBS_FOR_TEST: Lazy<Mutex<HashMap<i32, Box<[u8]>>>> = Lazy::new(Default::default);
#[cfg(not(target_arch = "wasm32"))]
static ALLOC_BLOB_ID: AtomicI32 = AtomicI32::new(0);

#[cfg(not(target_arch = "wasm32"))]
pub fn insert_blob_for_test(data: Box<[u8]>) -> i32 {
    let id = ALLOC_BLOB_ID.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    BLOBS_FOR_TEST.lock().unwrap().insert(id, data);
    id
}

#[cfg(not(target_arch = "wasm32"))]
impl BridgeFileStream {
    pub fn new(blob_id: i32) -> Self {
        Self {
            stream_id: blob_id,
            has_read: false,
        }
    }

    pub fn next(&mut self) -> Option<Box<[u8]>> {
        if self.has_read {
            None
        } else {
            let data = BLOBS_FOR_TEST
                .lock()
                .unwrap()
                .get(&self.stream_id)
                .unwrap()
                .clone();
            self.has_read = true;
            Some(data)
        }
    }
}
