use std::collections::HashMap;

use crate::AppViewProps;
use dioxus::{
    logger::tracing::{self, trace},
    prelude::*,
};

use crate::{
    apps::zip_viewer::ZIP_VIEWER_ID, compute_new_bounds_by_hit_test_result, registry::APP_MANAGER,
    AppId, AppWindowId, AppWindowManager, HitTestPosition, Point, Rect, APP_WINDOW_MANAGER,
};

#[derive(Props, PartialEq, Clone)]
struct VAppLauncherProps {
    id: AppId,
}

fn VAppLauncher(props: VAppLauncherProps) -> Element {
    let mut manager = APP_WINDOW_MANAGER.signal();
    let app_mgr = APP_MANAGER.read();
    let id = props.id;

    let onclick = {
        move |e: Event<MouseData>| {
            let coord = e.coordinates().page();

            let mut manager = manager.write();
            let id = manager.create(id, Point::new(coord.x, coord.y), None);
            manager.activate(id);
        }
    };

    let Some(app_cfg) = app_mgr.get(id).cloned() else {
        return rsx! {};
    };

    rsx! {
        div {
            width: "4rem",
            height: "4rem",
            border: "1px solid black",
            font_size: "0.8rem",
            onclick: onclick,
            {app_cfg.name}
        }
    }
}

#[derive(Props, PartialEq, Clone)]
struct VAppWindowProps {
    id: AppWindowId,
}

fn VAppWindow(props: VAppWindowProps) -> Element {
    let mut win_mgr = APP_WINDOW_MANAGER.signal();
    let app_mgr = APP_MANAGER.read();
    let id = props.id;

    let win = win_mgr.read().get(id).cloned();

    let Some(win) = win else {
        return rsx! {};
    };
    let Some(app_cfg) = app_mgr.get(win.app_id).cloned() else {
        return rsx! {};
    };

    let bounds = &win.bounds;

    let top = bounds.top;
    let left = bounds.left;
    let width = bounds.width();
    let height = bounds.height();
    let initial_data = win.resource_id;

    let mut handle_close = move |_| {
        win_mgr.write().close(id);
    };

    let V = app_cfg.render;

    rsx! {
        div {
            position: "absolute",
            top: "{top}px",
            left: "{left}px",
            width: "{width}px",
            height: "{height}px",
            border: "1px solid black",
            class: "absolute flex flex-col",
            // Toolbar
            div {
                class: "h-8 px-2 bg-gray-200 items-center justify-between flex shrink-0",
                // Window name
                div {
                    {win.title}
                }
                div {
                    onclick: move |e| {
                        e.stop_propagation(); // Prevent dragging when clicking close
                        handle_close(e);
                    },
                    cursor: "pointer",
                    "X"
                }
            }

            // Window Content
            div {
                flex_grow: "1",
                class: "bg-white overflow-hidden",
                onmousedown: move |e| {
                    e.stop_propagation();

                    win_mgr.write().activate(id);
                },

                V {
                    id,
                    initial_data,
                }
            }
        }
    }
}

struct DraggingWindowState {
    id: AppWindowId,
    hit_test: HitTestPosition,
    initial_position: Point,
    initial_bounds: Rect,
}
fn VApps() -> Element {
    let app_mgr = APP_MANAGER.signal();
    let mut manager = APP_WINDOW_MANAGER.signal();

    let mut dragging_state = use_signal::<Option<DraggingWindowState>>(|| None);
    let mut cursor_style = use_signal(|| "default".to_string());

    let handle_mouse_down = move |e: Event<MouseData>| {
        let coord = e.coordinates().page();
        let page_point = Point {
            x: coord.x,
            y: coord.y,
        };

        let hit_test_result = manager.write().hit_test(page_point.clone());

        if let Some(hit_test) = hit_test_result {
            let bounds = manager.read().get(hit_test.id).unwrap().bounds.clone();

            dragging_state.set(Some(DraggingWindowState {
                id: hit_test.id,
                hit_test: hit_test.position,
                initial_position: page_point,
                initial_bounds: bounds,
            }));

            manager.write().activate(hit_test.id);
            let new_cursor_style = hit_test_position_to_cursor_style(hit_test.position, true);
            cursor_style.set(new_cursor_style);
        }
    };

    let handle_mouse_move = move |e: Event<MouseData>| {
        let coord = e.coordinates().page();
        let current_pos = Point {
            x: coord.x,
            y: coord.y,
        };

        if let Some(state) = dragging_state.read().as_ref() {
            let delta_x = current_pos.x - state.initial_position.x;
            let delta_y = current_pos.y - state.initial_position.y;

            let new_bounds = compute_new_bounds_by_hit_test_result(
                &state.initial_bounds,
                state.hit_test,
                delta_x,
                delta_y,
            );
            manager.write().set_bounds(state.id, new_bounds);
        } else {
            let hit_test_result = manager.write().hit_test(current_pos);

            if let Some(hit_test) = hit_test_result {
                let new_cursor_style = hit_test_position_to_cursor_style(hit_test.position, false);
                cursor_style.set(new_cursor_style);
            } else {
                cursor_style.set("default".to_string());
            }
        }
    };

    let handle_mouse_up = move |_| {
        dragging_state.set(None);
        cursor_style.set("default".to_string());
    };
    let app_ids = app_mgr.read().list_ids();
    let window_ids = manager.read().list_ids();

    rsx! {
        div {
            position: "relative",
            display: "flex",
            gap: "1rem",
            width: "100%",
            height: "100%",
            onmousedown: handle_mouse_down,
            onmousemove: handle_mouse_move,
            onmouseup: handle_mouse_up,
            cursor: "{cursor_style.read()}",

            Fragment {
                for id in app_ids {
                    VAppLauncher {
                        key: "{id.raw()}",
                        id
                    }
                }
            }

            Fragment {
                for id in window_ids {
                    VAppWindow {
                        key: "{id.raw()}",
                        id,
                    }
                }
            }
        }
    }
}

fn hit_test_position_to_cursor_style(position: HitTestPosition, is_dragging: bool) -> String {
    match position {
        HitTestPosition::Inside => {
            if is_dragging {
                "grabbing"
            } else {
                "default"
            }
        }
        HitTestPosition::Left => "ew-resize",
        HitTestPosition::TopLeft => "nwse-resize",
        HitTestPosition::Top => "ns-resize",
        HitTestPosition::TopRight => "nesw-resize",
        HitTestPosition::Right => "ew-resize",
        HitTestPosition::BottomRight => "nwse-resize",
        HitTestPosition::Bottom => "ns-resize",
        HitTestPosition::BottomLeft => "nesw-resize",
    }
    .to_string()
}

pub fn VEntry() -> Element {
    use_hook(|| ());

    rsx! {
        div {
            width: "100vw",
            height: "100vh",

            VApps {}
        }
    }
}
