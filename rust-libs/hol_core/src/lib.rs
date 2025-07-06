mod utils;

mod core;
pub mod preset_pkgs;
pub mod proto;
pub mod setup;

pub use core::*;
use wasm_bindgen::prelude::*;

use crate::setup::create_app;

#[wasm_bindgen]
pub struct WasmApp {
    app: App,
}

#[wasm_bindgen]
impl WasmApp {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { app: create_app() }
    }

    #[wasm_bindgen]
    pub async fn invoke_command(&self, request: Box<[u8]>) -> Result<Vec<u8>, String> {
        let res = self.app.invoke_command(request.iter().as_slice()).await;

        match res {
            Ok(res) => Ok(res),
            Err(e) => Err(e.to_string()),
        }
    }
}
