use crate::core::spawn;
use std::future::Future;

use bridge::{send_ret, BridgeCall};
use checksum::{batch_digest, BatchDigest};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

mod bridge;
pub mod checksum;
pub mod core;

#[cfg(not(target_arch = "wasm32"))]
pub use bridge::insert_blob_for_test;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub fn call_impl<C, R, F: Fn(C::Arg) -> R + 'static>(_: C, arg: JsValue, call_id: i32, func: F)
where
    C: BridgeCall,
    R: Future<Output = C::Ret>,
    F: Fn(C::Arg) -> R + Sync + 'static,
{
    let arg: C::Arg = serde_wasm_bindgen::from_value(arg).unwrap();
    spawn(async move {
        let ret = func(arg).await;
        let ret = serde_wasm_bindgen::to_value(&ret).unwrap();
        send_ret(C::CODE, ret, call_id);
    });
}

#[wasm_bindgen]
pub fn call(code: i32, arg: JsValue, call_id: i32) {
    match code {
        BatchDigest::CODE => {
            call_impl(BatchDigest, arg, call_id, batch_digest);
        }
        _ => {
            panic!("unsupport code {}", code)
        }
    }
}
