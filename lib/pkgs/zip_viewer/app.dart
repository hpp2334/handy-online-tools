import 'package:desktop_drop/desktop_drop.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/archiver.pb.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

String _pkgId = "hol.archiver";

class _ArchiveFile {
  final String name;
  final String path;

  _ArchiveFile({required this.name, required this.path});
}

class _Archive {
  final List<_ArchiveFile> entries = List.empty(growable: true);

  _Archive(ICQueryDirRet r) {
    for (final item in r.items) {
      entries.add(
        _ArchiveFile(path: item.path, name: item.path.split('/').last),
      );
    }
  }
}

enum _Status { pending, success, error }

Future<ICOpenZipRet> _openZip(NativeApp app, ICOpenZipArg arg) async {
  return invokeCommand(app, _pkgId, "open_zip", arg, ICOpenZipRet.fromBuffer);
}

Future<ICQueryDirRet> _queryDir(NativeApp app, ICQueryDirArg arg) async {
  return invokeCommand(app, _pkgId, "query_dir", arg, ICQueryDirRet.fromBuffer);
}

class _Model extends ChangeNotifier {
  _Status _status = _Status.pending;
  String? _errorMessage;
  _Archive? _archive;

  _Status get status => _status;
  _Archive get archive => _archive!;
  String get errorMessage => _errorMessage!;

  Future<void> handleDrop(NativeApp app, DropItem item) async {
    final data = await item.readAsBytes();

    try {
      final handle = await _openZip(app, ICOpenZipArg(data: data));
      final queried = await _queryDir(
        app,
        ICQueryDirArg(archiver: handle.data),
      );
      _archive = _Archive(queried);
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
              return _ErrorWidget(errorMessage: model.errorMessage);
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
        final app = Provider.of<NativeApp>(context, listen: false);
        final file = details.files.first;
        await model.handleDrop(app, file);

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

class _ErrorWidget extends StatelessWidget {
  final String errorMessage;

  const _ErrorWidget({required this.errorMessage});

  @override
  Widget build(BuildContext context) {
    final model = Provider.of<_Model>(context, listen: false);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 50, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            errorMessage,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: Colors.red),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              model.reset();
            },
            child: const Text("Close"),
          ),
        ],
      ),
    );
  }
}

class _CoreWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final model = Provider.of<_Model>(context);

    return Column(
      children: [Expanded(child: _FileTreeView(archive: model.archive))],
    );
  }
}

class _FileTreeView extends StatefulWidget {
  final _Archive archive;

  const _FileTreeView({required this.archive});

  @override
  State<_FileTreeView> createState() => _FileTreeViewState();
}

class _FileTreeViewState extends State<_FileTreeView> {
  late _FileTreeNode rootNode;

  @override
  void initState() {
    super.initState();
    rootNode = _buildFileTree(widget.archive.entries);
  }

  _FileTreeNode _buildFileTree(List<_ArchiveFile> files) {
    final root = _FileTreeNode(
      name: 'root',
      isDirectory: true,
      path: '',
      children: [],
    );

    for (final file in files) {
      final pathParts = file.path.split('/');
      _FileTreeNode currentNode = root;

      // Create or find each directory in the path
      for (int i = 0; i < pathParts.length - 1; i++) {
        final part = pathParts[i];
        if (part.isEmpty) continue;

        _FileTreeNode? child = currentNode.children.firstWhere(
          (node) => node.name == part && node.isDirectory,
          orElse: () => _FileTreeNode(
            name: part,
            isDirectory: true,
            path: pathParts.sublist(0, i + 1).join('/'),
            children: [],
          ),
        );

        if (!currentNode.children.contains(child)) {
          currentNode.children.add(child);
        }

        currentNode = child;
      }

      // Add the file
      final fileName = pathParts.last;
      if (fileName.isNotEmpty) {
        currentNode.children.add(
          _FileTreeNode(
            name: fileName,
            isDirectory: false,
            path: file.path,
            children: [],
          ),
        );
      }
    }

    // Sort child nodes - directories first, then files
    _sortNodes(root);

    return root;
  }

  void _sortNodes(_FileTreeNode node) {
    node.children.sort((a, b) {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.compareTo(b.name);
    });

    for (final child in node.children) {
      if (child.isDirectory) {
        _sortNodes(child);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: rootNode.children.length,
      itemBuilder: (context, index) {
        return _FileTreeNodeWidget(node: rootNode.children[index], level: 0);
      },
    );
  }
}

class _FileTreeNode {
  final String name;
  final bool isDirectory;
  final String path;
  final List<_FileTreeNode> children;

  _FileTreeNode({
    required this.name,
    required this.isDirectory,
    required this.path,
    required this.children,
  });
}

class _FileTreeNodeWidget extends StatefulWidget {
  final _FileTreeNode node;
  final int level;

  const _FileTreeNodeWidget({required this.node, required this.level});

  @override
  State<_FileTreeNodeWidget> createState() => _FileTreeNodeWidgetState();
}

class _FileTreeNodeWidgetState extends State<_FileTreeNodeWidget> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: widget.node.isDirectory
              ? () {
                  setState(() {
                    _isExpanded = !_isExpanded;
                  });
                }
              : null,
          child: Padding(
            padding: EdgeInsets.only(left: 16.0 * widget.level),
            child: Row(
              children: [
                if (widget.node.isDirectory)
                  Icon(
                    _isExpanded
                        ? Icons.keyboard_arrow_down
                        : Icons.keyboard_arrow_right,
                    size: 20,
                  )
                else
                  const SizedBox(width: 20),
                const SizedBox(width: 8),
                Icon(
                  widget.node.isDirectory
                      ? Icons.folder
                      : Icons.insert_drive_file,
                  color: widget.node.isDirectory
                      ? Colors.amber
                      : Colors.blueGrey,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      widget.node.name,
                      style: TextStyle(
                        fontWeight: widget.node.isDirectory
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded && widget.node.isDirectory)
          ...widget.node.children.map((childNode) {
            return _FileTreeNodeWidget(
              node: childNode,
              level: widget.level + 1,
            );
          }),
      ],
    );
  }
}
