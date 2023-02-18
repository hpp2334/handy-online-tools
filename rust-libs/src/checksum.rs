use std::ops::Add;

use md5::{
    self,
    digest::{generic_array::ArrayLength, OutputSizeUser},
    Digest,
};
use num_derive::{FromPrimitive, ToPrimitive};
use num_traits::FromPrimitive;
use serde::{Deserialize, Serialize};

use wasm_bindgen::prelude::*;

use crate::bridge::{BridgeCall, BridgeCode, BridgeFileStream};

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

fn update_digest_impl<D>(
    digest_container: &mut Option<D>,
    items: &mut Vec<DigestResultItem>,
    data: &Option<Vec<u8>>,
    typ: DigestType,
) where
    D: Digest + Send + 'static,
    D::OutputSize: Add,
    <<D as OutputSizeUser>::OutputSize as Add>::Output: ArrayLength<u8>,
{
    if digest_container.is_none() {
        let _ = digest_container.insert(D::new());
    }
    let mut digest = digest_container.take().unwrap();
    if let Some(data) = data {
        digest.update(data);
        let _ = digest_container.insert(digest);
    } else {
        let hash = digest.finalize();
        let hash = format!("{:X}", hash);
        items.push(DigestResultItem {
            typ: typ as i32,
            val: hash,
        });
    }
}

pub async fn batch_digest(
    BatchDigestArg { typs, blob_id }: BatchDigestArg,
) -> Vec<DigestResultItem> {
    let mut stream = BridgeFileStream::new(blob_id);

    let mut md5_con: Option<md5::Md5> = Default::default();
    let mut sha1_con: Option<sha1::Sha1> = Default::default();
    let mut sha256_con: Option<sha2::Sha256> = Default::default();
    let mut items: Vec<DigestResultItem> = Default::default();
    loop {
        let data = stream.next().await;
        for typ in &typs {
            let typ = <DigestType as FromPrimitive>::from_i32(*typ).unwrap();
            match typ {
                DigestType::MD5 => update_digest_impl(&mut md5_con, &mut items, &data, typ),
                DigestType::SHA1 => update_digest_impl(&mut sha1_con, &mut items, &data, typ),
                DigestType::SHA256 => update_digest_impl(&mut sha256_con, &mut items, &data, typ),
            };
        }
        if data.is_none() {
            break;
        }
    }

    items
}
