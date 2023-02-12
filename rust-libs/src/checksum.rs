use std::{
    ops::Add,
};

use md5::{
    self,
    digest::{generic_array::ArrayLength, OutputSizeUser},
    Digest,
};
use num_derive::{FromPrimitive, ToPrimitive};
use num_traits::FromPrimitive;
use serde::{Deserialize, Serialize};


use wasm_bindgen::{prelude::*};

use crate::{
    bridge::{BridgeCall, BridgeCode, BridgeFileStream},
};

#[derive(Copy, Clone, Debug, Serialize, Deserialize, PartialEq, Eq, FromPrimitive, ToPrimitive)]
#[wasm_bindgen]
pub enum DigestType {
    MD5 = 0,
    SHA1 = 1,
    SHA256 = 2,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DigestResultItem {
    pub typ: i32,
    pub val: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BatchDigestArg {
    pub typs: Vec<i32>,
    pub blob_id: i32,
}

pub struct BatchDigest;

impl BridgeCall for BatchDigest {
    const CODE: i32 = BridgeCode::BatchDigest as i32;
    type Arg = BatchDigestArg;
    type Ret = Vec<DigestResultItem>;
}

fn digest_impl<D>(mut digest: D, blob_id: i32) -> String
where
    D: Digest + Send + 'static,
    D::OutputSize: Add,
    <<D as OutputSizeUser>::OutputSize as Add>::Output: ArrayLength<u8>,
{
    let mut stream = BridgeFileStream::new(blob_id);
    while let Some(data) = stream.next() {
        digest.update(data);
    }
    let hash = digest.finalize();
    let hash = format!("{:X}", hash);
    hash
}

pub async fn batch_digest(
    BatchDigestArg { typs, blob_id }: BatchDigestArg,
) -> Vec<DigestResultItem> {
    let mut items: Vec<DigestResultItem> = Default::default();
    for typ in typs {
        let typ = <DigestType as FromPrimitive>::from_i32(typ).unwrap();
        let val = match typ {
            DigestType::MD5 => digest_impl(md5::Md5::new(), blob_id),
            DigestType::SHA1 => digest_impl(sha1::Sha1::new(), blob_id),
            DigestType::SHA256 => digest_impl(sha2::Sha256::new(), blob_id),
        };

        items.push(DigestResultItem {
            typ: typ as i32,
            val,
        });
    }

    items
}
