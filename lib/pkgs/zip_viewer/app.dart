import 'package:archive/archive.dart';
import 'package:desktop_drop/desktop_drop.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

enum _Status { pending, success, error }

class _Model extends ChangeNotifier {
  _Status _status = _Status.pending;
  String? _errorMessage;
  Archive? _archive;

  _Status get status => _status;
  Archive get archive => _archive!;
  String get errorMessage => _errorMessage!;

  Future<void> handleDrop(DropItem item) async {
    final data = await item.readAsBytes();

    try {
      _archive = ZipDecoder().decodeBytes(data);
      _status = _Status.success;
    } catch (e) {
      _errorMessage = e.toString();
      _status = _Status.error;
    }
    notifyListeners();
  }

  void reset() {
    _status = _Status.pending;
    notifyListeners();
  }
}

class ZipViewerWidget extends StatefulWidget {
  const ZipViewerWidget({super.key});

  @override
  State<ZipViewerWidget> createState() => _ZipViewerWidgetState();
}

class _ZipViewerWidgetState extends State<ZipViewerWidget> {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => _Model(),
      child: Consumer<_Model>(
        builder: (context, model, _) {
          final status = model.status;

          switch (status) {
            case _Status.pending:
              return _PendingWidget();
            case _Status.success:
              return _CoreWidget();
            case _Status.error:
              return Center(
                child: Column(children: [Text(model.errorMessage)]),
              );
          }
        },
      ),
    );
  }
}

class _PendingWidget extends StatefulWidget {
  @override
  State<_PendingWidget> createState() => _PendingWidgetState();
}

class _PendingWidgetState extends State<_PendingWidget> {
  bool _dragging = false;

  @override
  Widget build(BuildContext context) {
    return DropTarget(
      onDragDone: (details) async {
        if (details.files.isEmpty) {
          return;
        }
        final model = Provider.of<_Model>(context, listen: false);
        final file = details.files.first;
        await model.handleDrop(file);

        if (!context.mounted) {
          return;
        }
        if (model.status == _Status.success) {
          Provider.of<TAppWindowModel>(
            context,
            listen: false,
          ).setTitle(file.name);
        }
      },
      onDragEntered: (details) {
        setState(() {
          _dragging = true;
        });
      },
      onDragExited: (detail) {
        setState(() {
          _dragging = false;
        });
      },
      child: Container(
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_upload, size: 50),
            if (!_dragging)
              const Text("Drag and drop archiver here")
            else
              const Text("Release to accept"),
          ],
        ),
      ),
    );
  }
}

class _CoreWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final model = Provider.of<_Model>(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Archive Contents',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => model.reset(),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            child: _DirectoryTree(archive: model.archive),
          ),
        ),
      ],
    );
  }
}

class _DirectoryTree extends StatefulWidget {
  final Archive archive;

  const _DirectoryTree({required this.archive});

  @override
  State<_DirectoryTree> createState() => _DirectoryTreeState();
}

class _DirectoryTreeState extends State<_DirectoryTree> {
  final Map<String, bool> _expandedDirs = {};

  @override
  Widget build(BuildContext context) {
    // Build a tree structure from the flat archive
    final Map<String, List<ArchiveFile>> directoryStructure = {};

    for (var file in widget.archive.files) {
      final path = file.name;
      final parts = path.split('/');

      // Skip empty entries
      if (parts.isEmpty || (parts.length == 1 && parts[0].isEmpty)) {
        continue;
      }

      // Get the directory path (everything except the filename)
      String dirPath = '';
      if (parts.length > 1) {
        dirPath = parts.sublist(0, parts.length - 1).join('/');
      }

      // Initialize the directory if it doesn't exist
      directoryStructure[dirPath] = directoryStructure[dirPath] ?? [];

      // Add the file to its directory
      directoryStructure[dirPath]!.add(file);
    }

    // Build the tree widget
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: _buildDirectoryNode('', directoryStructure, 0),
    );
  }

  Widget _buildDirectoryNode(
    String path,
    Map<String, List<ArchiveFile>> structure,
    int level,
  ) {
    List<Widget> children = [];

    // Get all subdirectories of current path
    final subDirs = structure.keys
        .where(
          (dir) =>
              dir.startsWith(path) &&
              (path.isEmpty || dir.startsWith('$path/')) &&
              dir != path &&
              !dir.substring(path.isEmpty ? 0 : path.length + 1).contains('/'),
        )
        .toList();

    // Sort subdirectories
    subDirs.sort();

    // Add subdirectory nodes
    for (var dir in subDirs) {
      final dirName = dir.substring(path.isEmpty ? 0 : path.length + 1);
      final isExpanded = _expandedDirs[dir] ?? false;

      children.add(
        Padding(
          padding: EdgeInsets.only(left: level * 16.0),
          child: Row(
            children: [
              InkWell(
                onTap: () {
                  setState(() {
                    _expandedDirs[dir] = !isExpanded;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(4.0),
                  child: Text(
                    isExpanded ? '−' : '+',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _expandedDirs[dir] = !isExpanded;
                  });
                },
                child: Row(
                  children: [
                    const SizedBox(
                      width: 18,
                      child: Icon(Icons.folder, color: Colors.amber, size: 16),
                    ),
                    const SizedBox(width: 4),
                    Text(dirName),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

      if (isExpanded) {
        children.add(_buildDirectoryNode(dir, structure, level + 1));
      }
    }

    // Add files in the current directory
    final files = structure[path] ?? [];

    // Sort files
    files.sort((a, b) => a.name.compareTo(b.name));

    for (var file in files) {
      final fileName = file.name.split('/').last;
      if (fileName.isNotEmpty) {
        children.add(
          Padding(
            padding: EdgeInsets.only(
              left: (level + 1) * 16.0 + 4,
              top: 4,
              right: 4,
              bottom: 4,
            ),
            child: Row(
              children: [
                const SizedBox(
                  width: 18,
                  child: Icon(
                    Icons.insert_drive_file,
                    color: Colors.blue,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 4),
                Text(fileName),
              ],
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}
