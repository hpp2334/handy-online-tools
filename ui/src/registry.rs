use crate::{
    apps::{image_viewer::image_viewer_config, zip_viewer::zip_view_config},
    AppManager, AppWindowManager, ResourceManager,
};
use dioxus::prelude::*;

pub static APP_MANAGER: GlobalSignal<AppManager> = Global::new(|| {
    let mut mgr = AppManager::new();
    mgr.register(zip_view_config());
    mgr.register(image_viewer_config());
    mgr
});

pub static APP_WINDOW_MANAGER: GlobalSignal<AppWindowManager> =
    Global::new(|| AppWindowManager::new());
