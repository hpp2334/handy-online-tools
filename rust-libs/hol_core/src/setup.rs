use crate::{App, CommandManager};

pub fn create_app() -> App {
    let mut cmd_mgr = CommandManager::new();

    crate::preset_pkgs::archiver::setup_command(&mut cmd_mgr);
    crate::preset_pkgs::blob::setup_command(&mut cmd_mgr);

    App::new(cmd_mgr)
}
