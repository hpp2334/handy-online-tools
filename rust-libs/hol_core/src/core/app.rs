use std::{cell::RefCell, rc::Rc};

use prost::Message;

use crate::{CommandManager, ResourceManager, TResult, proto::TInvokeCommandRequest};

pub struct AppContext {
    pub res_mgr: Rc<RefCell<ResourceManager>>,
}

pub struct App {
    cmd_mgr: Rc<RefCell<CommandManager>>,
    res_mgr: Rc<RefCell<ResourceManager>>,
}

impl App {
    pub fn new(cmd_mgr: CommandManager) -> Self {
        Self {
            cmd_mgr: Rc::new(RefCell::new(cmd_mgr)),
            res_mgr: Rc::new(RefCell::new(ResourceManager::new())),
        }
    }

    pub async fn invoke_command(&self, request: &[u8]) -> TResult<Vec<u8>> {
        let cmd_mgr = self.cmd_mgr.borrow();
        let request = TInvokeCommandRequest::decode(request)?;
        let mut cx = AppContext {
            res_mgr: self.res_mgr.clone(),
        };
        let resp = cmd_mgr.invoke(&mut cx, request).await;

        let resp = resp.encode_to_vec();
        Ok(resp)
    }
}
