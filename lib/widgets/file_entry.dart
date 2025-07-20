import 'package:file_saver/file_saver.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:handy_online_tools/pkgs/blob/command.dart';
import 'package:provider/provider.dart';

class _Deps {
  final Future<(TBlobResource, String)> Function() getResource;

  _Deps({required this.getResource});
}


Future<void> _openAs(BuildContext context, TBlobResource resource, String fileName) async {
  final apps = Provider.of<TAppRegistryModel>(context, listen: false);
  final appWins = Provider.of<TAppWindowsModel>(context, listen: false);
  final allApps = apps.list();
  if (!context.mounted) {
    return;
  }
  await showDialog(
    context: context,
    builder: (BuildContext dialogContext) {
      return AlertDialog(
        title: const Text('Choose an app to open with'),
        content: SizedBox(
          width: 300,
          height: 400,
          child: ListView.builder(
            itemCount: allApps.length,
            itemBuilder: (context, index) {
              final app = allApps[index];
              return ListTile(
                leading: Icon(app.iconData),
                title: Text(app.name),
                onTap: () {
                  Navigator.of(dialogContext).pop();
                  appWins.create(
                    app,
                    TAppExternal(resource: resource, fileName: fileName),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Cancel'),
          ),
        ],
      );
    },
  );
}

Future<void> _openAsHandler(BuildContext context, _Deps deps) async {
  final (resource, fileName) = await deps.getResource();
  await _openAs(context, resource, fileName);
}

void _openHandler(BuildContext context, _Deps deps) async {
  final apps = Provider.of<TAppRegistryModel>(context, listen: false);
  final appWins = Provider.of<TAppWindowsModel>(context, listen: false);

  final (resource, fileName) = await deps.getResource();
  final preferredApp = apps.recommendApp(fileName);

  if (preferredApp != null) {
    appWins.create(
      preferredApp,
      TAppExternal(resource: resource, fileName: fileName),
    );
  } else {
    _openAs(context, resource, fileName);
  }
}

void _downloadHandler(BuildContext context, _Deps deps) async {
  final nativeApp = Provider.of<NativeApp>(context, listen: false);
  final (resource, fileName) = await deps.getResource();
  final data = await loadBlob(nativeApp, ICLoadBlobArg(data: resource));

  await FileSaver.instance.saveFile(
    name: fileName,
    bytes: data,
    mimeType: MimeType.other,
  );
}

void _showFileMenu(BuildContext context, TapUpDetails details, _Deps deps) {
  final RenderBox overlay =
      Overlay.of(context).context.findRenderObject() as RenderBox;
  final RelativeRect position = RelativeRect.fromRect(
    Rect.fromPoints(details.globalPosition, details.globalPosition),
    Offset.zero & overlay.size,
  );

  showMenu(
    context: context,
    position: position,
    items: <PopupMenuEntry>[
      PopupMenuItem(
        value: 'Open',
        onTap: () {
          _openHandler(context, deps);
        },
        child: const Text('Open'),
      ),
      PopupMenuItem(
        value: 'Open As',
        onTap: () {
          _openAsHandler(context, deps);
        },
        child: const Text('Open As'),
      ),
      PopupMenuItem(
        value: 'Download',
        onTap: () {
          _downloadHandler(context, deps);
        },
        child: const Text('Download'),
      ),
    ],
  );
}

/// A widget representing a file entry that responds to hover, click and right-click events.
/// Shows hover effect, ripple effect on click, and displays a context menu on right-click.
class FileEntryWidget extends StatefulWidget {
  final Widget child;
  final Future<(TBlobResource, String)> Function() getResource;

  const FileEntryWidget({
    super.key,
    required this.child,
    required this.getResource,
  });

  @override
  State<FileEntryWidget> createState() => _FileEntryWidgetState();
}

class _FileEntryWidgetState extends State<FileEntryWidget> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    final deps = _Deps(getResource: widget.getResource);
    return MouseRegion(
      onEnter: (_) => setState(() => isHovered = true),
      onExit: (_) => setState(() => isHovered = false),
      child: GestureDetector(
        onTap: () {
          _openHandler(context, deps);
        },
        onSecondaryTapUp: (details) {
          // Show context menu on right-click
          _showFileMenu(context, details, deps);
        },
        child: Material(
          color: isHovered
              ? Colors.grey.withValues(alpha: .3)
              : Colors.transparent,
          child: InkWell(
            splashColor: Colors.grey.withValues(alpha: .5),
            highlightColor: Colors.grey.withValues(alpha: .3),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
