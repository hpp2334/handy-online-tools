use std::{
    cell::{RefCell, RefMut},
    collections::HashMap,
    rc::Rc,
    sync::Arc,
};

use futures::future::LocalBoxFuture;

use crate::{
    AppContext, ResourceManager, TResult,
    proto::{TCommandId, TInvokeCommandRequest, TInvokeCommandResponse, TPackageId},
};

#[derive(Debug, Hash, PartialEq, Eq)]
pub struct CommandKey {
    pkg_id: TPackageId,
    cmd_id: TCommandId,
}

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("Missing required field: {field}")]
    MissingField { field: String },
    #[error("Invalid field type for {field}: expected {expected}")]
    InvalidFieldType { field: String, expected: String },
    #[error("Invalid field value: {message}")]
    InvalidValue { message: String },
    #[error("Invalid field value: {cmd_key:?}")]
    CommandNotFound { cmd_key: CommandKey },
}

pub struct InvokeCommandContext {
    _res_mgr: Rc<RefCell<ResourceManager>>,
}

impl InvokeCommandContext {
    pub fn new(res_mgr: Rc<RefCell<ResourceManager>>) -> Self {
        Self { _res_mgr: res_mgr }
    }

    pub fn res_mgr(&mut self) -> RefMut<ResourceManager> {
        self._res_mgr.borrow_mut()
    }
}

// Type alias for the command handler function
type CommandHandler =
    Box<dyn Fn(InvokeCommandContext, Vec<u8>) -> LocalBoxFuture<'static, TResult<Vec<u8>>>>;
pub struct CommandManager {
    commands: HashMap<CommandKey, CommandHandler>,
}

impl CommandManager {
    pub fn new() -> Self {
        Self {
            commands: HashMap::new(),
        }
    }

    pub fn add<Arg, Ret, RetValue>(
        &mut self,
        pkg_id: &'static str,
        cmd_id: &'static str,
        handler: impl Fn(InvokeCommandContext, Arg) -> Ret + 'static,
    ) where
        Arg: prost::Message + Default + 'static,
        Ret: Future<Output = TResult<RetValue>> + 'static,
        RetValue: prost::Message + 'static,
    {
        let key = CommandKey {
            pkg_id: TPackageId {
                identifier: pkg_id.to_string(),
            },
            cmd_id: TCommandId {
                name: cmd_id.to_string(),
            },
        };

        let wrapper: CommandHandler = {
            let handler = Arc::new(handler);
            Box::new(move |cx, data| {
                Box::pin({
                    let value = handler.clone();
                    async move {
                        // Decode the argument
                        let arg = Arg::decode(&data[..])?;

                        // Call the handler
                        let result = value(cx, arg).await?;

                        // Encode the result
                        let mut buf = Vec::new();
                        result.encode(&mut buf)?;
                        Ok(buf)
                    }
                })
            })
        };

        self.commands.insert(key, wrapper);
    }

    async fn invoke_impl(
        &self,
        cx: &mut AppContext,
        request: TInvokeCommandRequest,
    ) -> TResult<Vec<u8>> {
        let pkg_id = request.pkg_id.ok_or(CommandError::MissingField {
            field: "pkg_id".to_string(),
        })?;
        let cmd_id = request.command_id.ok_or(CommandError::MissingField {
            field: "cmd_id".to_string(),
        })?;

        let command_key = CommandKey { pkg_id, cmd_id };

        match self.commands.get(&command_key) {
            Some(handler) => {
                let invoke_cx = InvokeCommandContext::new(cx.res_mgr.clone());

                return handler(invoke_cx, request.arguments).await;
            }
            None => Err(CommandError::CommandNotFound {
                cmd_key: command_key,
            })?,
        }
    }

    pub async fn invoke(
        &self,
        cx: &mut AppContext,
        request: TInvokeCommandRequest,
    ) -> TInvokeCommandResponse {
        let result = self.invoke_impl(cx, request).await;
        match result {
            Ok(result_data) => TInvokeCommandResponse {
                success: true,
                returns: result_data,
                error_message: None,
            },
            Err(e) => TInvokeCommandResponse {
                success: false,
                returns: Vec::new(),
                error_message: Some(e.to_string()),
            },
        }
    }
}
