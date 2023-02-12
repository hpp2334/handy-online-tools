use rust_libs::core::init;
use rust_libs::{checksum::*, insert_blob_for_test};

#[tokio::test]
async fn checksum_md5() {
    init();
    let blob_id = insert_blob_for_test(Box::new([1, 2, 3, 4, 5, 6]));
    let ret = batch_digest(BatchDigestArg {
        typs: vec![DigestType::MD5 as i32],
        blob_id,
    })
    .await;
    assert_eq!(ret.len(), 1);
    assert_eq!(ret[0].typ, DigestType::MD5 as i32);
    assert_eq!(ret[0].val, "6AC1E56BC78F031059BE7BE854522C4C");
}
