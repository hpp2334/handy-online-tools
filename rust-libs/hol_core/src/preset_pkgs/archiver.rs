use std::{collections::HashMap, io::Cursor, pin::Pin, sync::Arc};

use futures::future::{BoxFuture, LocalBoxFuture};
use serde::Serialize;
use zip::ZipArchive;

use crate::{
    CommandManager, InvokeCommandContext,
    core::TResult,
    proto::{
        IcLoadFileArg, IcLoadFileRet, IcOpenZipArg, IcOpenZipRet, IcQueryDirArg, IcQueryDirRet,
        TResource,
    },
};

#[derive(Debug, thiserror::Error)]
pub enum ArchiverError {
    #[error("Missing archiver resource handle")]
    MissingArchiverHandle,
    #[error("Missing archiver resource: {resource:?}")]
    MissingArchiver { resource: TResource },
}

async fn open_zip(mut cx: InvokeCommandContext, data: IcOpenZipArg) -> TResult<IcOpenZipRet> {
    let cursor = Cursor::new(data.data);
    let archiver = ZipArchive::new(cursor)?;

    let resource = cx.res_mgr().allocate(archiver);

    Ok(IcOpenZipRet {
        data: Some(resource),
    })
}

async fn query_dir(mut cx: InvokeCommandContext, data: IcQueryDirArg) -> TResult<IcQueryDirRet> {
    let archiver_handle = data.archiver.ok_or(ArchiverError::MissingArchiverHandle)?;

    let mut res_mgr = cx.res_mgr();
    let archiver = res_mgr
        .get_mut::<ZipArchive<Cursor<Vec<u8>>>>(&archiver_handle)
        .ok_or(ArchiverError::MissingArchiver {
            resource: archiver_handle,
        })?;
    let mut items = Vec::new();

    // Second pass: Process all files and directories, building the tree structure
    for i in 0..archiver.len() {
        let file = archiver.by_index(i)?;
        let path = file.name();

        items.push(crate::proto::QueryDirItem {
            path: path.to_string(),
        });
    }

    Ok(IcQueryDirRet { items })
}

async fn load_file(mut cx: InvokeCommandContext, data: IcLoadFileArg) -> TResult<IcLoadFileRet> {
    let archiver_handle = data.archiver.ok_or(ArchiverError::MissingArchiverHandle)?;
    let mut res_mgr = cx.res_mgr();

    let mut buffer = Vec::new();
    {
        let archiver = res_mgr
            .get_mut::<ZipArchive<Cursor<Vec<u8>>>>(&archiver_handle)
            .ok_or(ArchiverError::MissingArchiver {
                resource: archiver_handle,
            })?;

        let mut file = archiver.by_name(&data.path)?;
        std::io::Read::read_to_end(&mut file, &mut buffer)?;
    }

    let resource = res_mgr.allocate_blob(buffer);

    Ok(IcLoadFileRet {
        data: Some(resource),
    })
}

const ARCHIVER_PKG_ID: &'static str = "hol.archiver";

pub fn setup_command(mgr: &mut CommandManager) {
    mgr.add(ARCHIVER_PKG_ID, "open_zip", open_zip);
    mgr.add(ARCHIVER_PKG_ID, "query_dir", query_dir);
    mgr.add(ARCHIVER_PKG_ID, "load_file", load_file);
}
