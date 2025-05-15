use crate::{apps::zip_viewer::zip_view_config, AppManager};
use dioxus::prelude::*;

pub static APP_MANAGER: GlobalSignal<AppManager> = Global::new(|| {
    let mut mgr = AppManager::new();
    mgr.register(zip_view_config());
    mgr
});
