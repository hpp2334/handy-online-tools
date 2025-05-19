//! This crate contains all shared UI for the workspace.
#![allow(non_snake_case)]

mod core;
mod registry;
mod views;

mod apps;
mod entry;

pub use core::*;
pub use entry::VEntry;
pub use registry::*;
