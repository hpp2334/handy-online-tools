use dioxus::{
    prelude::*,
    signals::{Global, GlobalSignal, Readable},
};

use crate::{app_registry::APP_MANAGER, Point, Rect};

use super::AppId;

#[derive(Debug, PartialEq, Eq, Hash, Clone, Copy)]
pub struct AppWindowId(u32);

#[derive(Debug, Clone, Copy)]
pub enum HitTestPosition {
    Inside,
    Left,
    TopLeft,
    Top,
    TopRight,
    Right,
    BottomRight,
    Bottom,
    BottomLeft,
}

pub struct HitTestResult {
    pub id: AppWindowId,
    pub position: HitTestPosition,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppWindow {
    pub id: AppWindowId,
    pub app_id: AppId,
    pub title: String,
    pub bounds: Rect,
}

#[derive(Debug)]
pub struct AppWindowManager {
    alloc_id: u32,
    windows: Vec<AppWindow>,
}

#[derive(Props, PartialEq, Clone)]
pub struct AppViewProps {
    pub id: AppWindowId,
}

pub static APP_WINDOW_MANAGER: GlobalSignal<AppWindowManager> =
    Global::new(|| AppWindowManager::new());

impl AppWindowManager {
    pub fn new() -> Self {
        AppWindowManager {
            alloc_id: 0,
            windows: vec![],
        }
    }

    pub fn create(&mut self, app_id: AppId, offset: Point) -> AppWindowId {
        let app_mgr = APP_MANAGER.read();

        let id = AppWindowId(self.alloc_id);
        self.alloc_id += 1;
        let app_cfg = app_mgr.get(app_id).unwrap();
        let window = AppWindow {
            id,
            app_id,
            title: app_cfg.name.clone(),
            bounds: Rect::new_xywh(
                offset.x,
                offset.y,
                app_cfg.default_size.x,
                app_cfg.default_size.y,
            ),
        };
        self.windows.push(window);
        id
    }

    pub fn get(&self, id: AppWindowId) -> Option<&AppWindow> {
        self.windows.iter().find(|w| w.id == id)
    }

    pub fn set_title(&mut self, id: AppWindowId, title: String) {
        if let Some(window) = self.windows.iter_mut().find(|w| w.id == id) {
            window.title = title;
        }
    }

    pub fn list_ids(&self) -> Vec<AppWindowId> {
        self.windows.iter().map(|w| w.id).collect()
    }

    pub fn hit_test(&mut self, pos: Point) -> Option<HitTestResult> {
        const MARGIN: f64 = 4.0;
        let hit_test_bounds = Rect::new_ltrb(
            pos.x - MARGIN,
            pos.y - MARGIN,
            pos.x + MARGIN,
            pos.y + MARGIN,
        );
        self.hit_test_rect(hit_test_bounds)
    }

    pub fn hit_test_rect(&mut self, bounds: Rect) -> Option<HitTestResult> {
        const MARGIN: f64 = 4.0;
        // Hit-test from back to front
        for window in self.windows.iter().rev() {
            let rect = &window.bounds;

            // Check corners first
            let top_left =
                Rect::new_ltrb(rect.left, rect.top, rect.left + MARGIN, rect.top + MARGIN);
            if top_left.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::TopLeft,
                });
            }
            let top_right =
                Rect::new_ltrb(rect.right - MARGIN, rect.top, rect.right, rect.top + MARGIN);
            if top_right.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::TopRight,
                });
            }
            let bottom_left = Rect::new_ltrb(
                rect.left,
                rect.bottom - MARGIN,
                rect.left + MARGIN,
                rect.bottom,
            );
            if bottom_left.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::BottomLeft,
                });
            }
            let bottom_right = Rect::new_ltrb(
                rect.right - MARGIN,
                rect.bottom - MARGIN,
                rect.right,
                rect.bottom,
            );
            if bottom_right.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::BottomRight,
                });
            }

            // Check edges
            let top_edge = Rect::new_ltrb(
                rect.left + MARGIN,
                rect.top,
                rect.right - MARGIN,
                rect.top + MARGIN,
            );
            if top_edge.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::Top,
                });
            }
            let bottom_edge = Rect::new_ltrb(
                rect.left + MARGIN,
                rect.bottom - MARGIN,
                rect.right - MARGIN,
                rect.bottom,
            );
            if bottom_edge.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::Bottom,
                });
            }
            let left_edge = Rect::new_ltrb(
                rect.left,
                rect.top + MARGIN,
                rect.left + MARGIN,
                rect.bottom - MARGIN,
            );
            if left_edge.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::Left,
                });
            }
            let right_edge = Rect::new_ltrb(
                rect.right - MARGIN,
                rect.top + MARGIN,
                rect.right,
                rect.bottom - MARGIN,
            );
            if right_edge.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::Right,
                });
            }

            // Check inside
            if rect.intersects(&bounds) {
                return Some(HitTestResult {
                    id: window.id,
                    position: HitTestPosition::Inside,
                });
            }
        }
        None
    }

    pub fn set_bounds(&mut self, id: AppWindowId, bounds: Rect) {
        if let Some(window) = self.windows.iter_mut().find(|w| w.id == id) {
            window.bounds = bounds;
        }
    }

    pub fn activate(&mut self, id: AppWindowId) {
        let mut found_index = None;
        for (i, window) in self.windows.iter().enumerate() {
            if window.id == id {
                found_index = Some(i);
                break;
            }
        }

        if let Some(index) = found_index {
            let window = self.windows.remove(index);
            self.windows.push(window);
        }
    }

    pub fn close(&mut self, id: AppWindowId) {
        self.windows.retain(|w| w.id != id);
    }
}

pub fn compute_new_bounds_by_hit_test_result(
    initial_bounds: &Rect,
    hit_test: HitTestPosition,
    delta_x: f64,
    delta_y: f64,
) -> Rect {
    let mut new_bounds = initial_bounds.clone();
    const MIN_WIDTH: f64 = 100.0;
    const MIN_HEIGHT: f64 = 100.0;

    match hit_test {
        HitTestPosition::Inside => {
            new_bounds = initial_bounds.offset(delta_x, delta_y);
        }
        HitTestPosition::Left => {
            new_bounds.left = initial_bounds.left + delta_x;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.left = initial_bounds.right - MIN_WIDTH;
            }
        }
        HitTestPosition::TopLeft => {
            new_bounds.left = initial_bounds.left + delta_x;
            new_bounds.top = initial_bounds.top + delta_y;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.left = initial_bounds.right - MIN_WIDTH;
            }
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.top = initial_bounds.bottom - MIN_HEIGHT;
            }
        }
        HitTestPosition::Top => {
            new_bounds.top = initial_bounds.top + delta_y;
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.top = initial_bounds.bottom - MIN_HEIGHT;
            }
        }
        HitTestPosition::TopRight => {
            new_bounds.right = initial_bounds.right + delta_x;
            new_bounds.top = initial_bounds.top + delta_y;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.right = initial_bounds.left + MIN_WIDTH;
            }
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.top = initial_bounds.bottom - MIN_HEIGHT;
            }
        }
        HitTestPosition::Right => {
            new_bounds.right = initial_bounds.right + delta_x;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.right = initial_bounds.left + MIN_WIDTH;
            }
        }
        HitTestPosition::BottomRight => {
            new_bounds.right = initial_bounds.right + delta_x;
            new_bounds.bottom = initial_bounds.bottom + delta_y;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.right = initial_bounds.left + MIN_WIDTH;
            }
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.bottom = initial_bounds.top + MIN_HEIGHT;
            }
        }
        HitTestPosition::Bottom => {
            new_bounds.bottom = initial_bounds.bottom + delta_y;
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.bottom = initial_bounds.top + MIN_HEIGHT;
            }
        }
        HitTestPosition::BottomLeft => {
            new_bounds.left = initial_bounds.left + delta_x;
            new_bounds.bottom = initial_bounds.bottom + delta_y;
            if new_bounds.width() < MIN_WIDTH {
                new_bounds.left = initial_bounds.right - MIN_WIDTH;
            }
            if new_bounds.height() < MIN_HEIGHT {
                new_bounds.bottom = initial_bounds.top + MIN_HEIGHT;
            }
        }
    }
    new_bounds
}
