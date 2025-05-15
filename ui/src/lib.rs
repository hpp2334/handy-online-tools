//! This crate contains all shared UI for the workspace.
#![allow(non_snake_case)]

mod app_registry;
mod core;

mod apps;
mod entry;

pub use core::*;
pub use entry::VEntry;
