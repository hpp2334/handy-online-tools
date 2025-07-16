use crate::{
    CommandManager, InvokeCommandContext, TResult,
    proto::{IcLoadBlobArg, IcLoadBlobRet, TBlobResource},
};

#[derive(Debug, thiserror::Error)]
pub enum BlobCommandError {
    #[error("Missing blob resource handle")]
    MissingResourceHandle,
    #[error("Missing blob resource {0:?}")]
    MissingResource(TBlobResource),
}

async fn load_blob_data(
    mut cx: InvokeCommandContext,
    data: IcLoadBlobArg,
) -> TResult<IcLoadBlobRet> {
    let res_mgr = cx.res_mgr();
    let handle = data.data.ok_or(BlobCommandError::MissingResourceHandle)?;

    let blob = res_mgr
        .get_blob(&handle)
        .ok_or(BlobCommandError::MissingResource(handle))?;

    Ok(IcLoadBlobRet { data: blob.clone() })
}

const BLOB_PKG_ID: &'static str = "hol.blob";

pub fn setup_command(mgr: &mut CommandManager) {
    mgr.add(BLOB_PKG_ID, "load_blob_data", load_blob_data);
}
