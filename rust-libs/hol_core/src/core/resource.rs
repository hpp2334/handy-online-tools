use std::{any::Any, collections::HashMap};

use crate::proto::{TBlobResource, TResource};

pub struct ResourceManager {
    alloc_id: u64,
    resouces: HashMap<u64, Box<dyn Any>>,
}

impl ResourceManager {
    pub fn new() -> Self {
        Self {
            alloc_id: 0,
            resouces: HashMap::new(),
        }
    }

    pub fn allocate<T: 'static>(&mut self, resource: T) -> TResource {
        let id = self.alloc_id;
        self.alloc_id += 1;
        self.resouces.insert(id, Box::new(resource));

        TResource { id }
    }

    pub fn allocate_blob(&mut self, resource: Vec<u8>) -> TBlobResource {
        let id = self.alloc_id;
        self.alloc_id += 1;
        self.resouces.insert(id, Box::new(resource));

        TBlobResource { id }
    }

    pub fn get<T: 'static>(&self, handle: &TResource) -> Option<&T> {
        self.resouces.get(&handle.id)?.downcast_ref()
    }

    pub fn get_blob(&self, handle: &TBlobResource) -> Option<&Vec<u8>> {
        self.resouces.get(&handle.id)?.downcast_ref::<Vec<u8>>()
    }

    pub fn get_mut<T: 'static>(&mut self, handle: &TResource) -> Option<&mut T> {
        self.resouces.get_mut(&handle.id)?.downcast_mut()
    }

    pub fn remove<T: 'static>(&mut self, handle: &TResource) {
        self.resouces.remove(&handle.id);
    }
}
