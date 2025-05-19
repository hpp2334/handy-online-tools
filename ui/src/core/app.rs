use std::collections::HashMap;

use dioxus::prelude::*;

use super::Point;
use crate::AppViewProps;

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash)]
pub struct AppId(u64);

impl AppId {
    pub const fn wrap(value: u64) -> Self {
        Self(value)
    }
    pub const fn raw(&self) -> u64 {
        self.0
    }
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub id: AppId,
    pub name: String,
    pub default_size: Point,
    pub min_size: Point,
    pub extensions: Vec<&'static str>,
    pub render: fn(AppViewProps) -> Element,
}

pub struct AppManager {
    apps: HashMap<AppId, AppConfig>,
}

impl AppManager {
    pub fn new() -> Self {
        Self {
            apps: Default::default(),
        }
    }

    pub fn register(&mut self, config: AppConfig) {
        self.apps.insert(config.id, config);
    }

    pub fn get(&self, id: AppId) -> Option<&AppConfig> {
        self.apps.get(&id)
    }

    pub fn list_ids(&self) -> Vec<AppId> {
        let mut ids: Vec<AppId> = self.apps.keys().cloned().collect();
        ids.sort_by_key(|id| id.0);
        ids
    }

    pub fn select_default(&self, extension: &str) -> Option<AppId> {
        self.apps
            .values()
            .find(|config| config.extensions.contains(&extension))
            .map(|config| config.id)
    }
}
