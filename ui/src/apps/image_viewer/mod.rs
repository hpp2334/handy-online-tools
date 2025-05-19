use crate::{AppConfig, AppId, Point};
use view::VView;

mod view;

pub const IMAGE_VIEWER_ID: AppId = AppId::wrap(2);

pub fn image_viewer_config() -> AppConfig {
    AppConfig {
        id: IMAGE_VIEWER_ID,
        name: "Image Viewer".into(),
        default_size: Point { x: 800.0, y: 600.0 },
        min_size: Point { x: 200.0, y: 200.0 },
        extensions: vec![".png", ".jpeg", ".jpg", ".svg", ".webp"],
        render: VView,
    }
}
