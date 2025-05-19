use dioxus::prelude::*;
use std::collections::HashMap;

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash)]
pub struct ResourceId(u64);

struct Resource {
    data: Vec<u8>,
}

pub struct ResourceManager {
    resources: HashMap<ResourceId, Resource>,
}

pub static RESOURCE_MANAGER: GlobalSignal<ResourceManager> = Global::new(|| ResourceManager::new());

impl ResourceManager {
    pub fn new() -> Self {
        ResourceManager {
            resources: HashMap::new(),
        }
    }

    pub fn allocate(&mut self, data: Vec<u8>) -> ResourceId {
        let id = ResourceId(self.resources.len() as u64);
        let resource = Resource { data };
        self.resources.insert(id, resource);
        id
    }

    pub fn get(&self, id: ResourceId) -> &[u8] {
        self.resources
            .get(&id)
            .map(|resource| resource.data.as_slice())
            .unwrap()
    }
}
