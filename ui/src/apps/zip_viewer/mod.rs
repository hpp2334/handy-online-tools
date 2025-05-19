use view::VView;

use crate::{AppConfig, AppId, Point};

mod core;
mod view;

pub const ZIP_VIEWER_ID: AppId = AppId::wrap(1);

pub fn zip_view_config() -> AppConfig {
    AppConfig {
        id: ZIP_VIEWER_ID,
        name: "Zip Viewer".into(),
        default_size: Point { x: 800.0, y: 600.0 },
        min_size: Point { x: 200.0, y: 200.0 },
        extensions: vec![".zip"],
        render: VView,
    }
}
