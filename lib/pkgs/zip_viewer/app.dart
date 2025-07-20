import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/archiver.pb.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/widgets/file_entry.dart';
import 'package:handy_online_tools/widgets/pending_file.dart';
import 'package:provider/provider.dart';

String _pkgId = "hol.archiver";

class _ArchiveFile {
  final String name;
  final String path;

  _ArchiveFile({required this.name, required this.path});
}

class _Archive {
  final TResource handle;
  final List<_ArchiveFile> entries = List.empty(growable: true);

  _Archive(this.handle, ICQueryDirRet r) {
    for (final item in r.items) {
      entries.add(
        _ArchiveFile(path: item.path, name: item.path.split('/').last),
      );
    }
  }
}

Future<ICOpenZipRet> _openZip(NativeApp app, ICOpenZipArg arg) async {
  return invokeCommand(app, _pkgId, "open_zip", arg, ICOpenZipRet.fromBuffer);
}

Future<ICQueryDirRet> _queryDir(NativeApp app, ICQueryDirArg arg) async {
  return invokeCommand(app, _pkgId, "query_dir", arg, ICQueryDirRet.fromBuffer);
}

Future<ICLoadFileRet> _loadFile(NativeApp app, ICLoadFileArg arg) async {
  return invokeCommand(app, _pkgId, "load_file", arg, ICLoadFileRet.fromBuffer);
}

class ZipViewerWidget extends StatelessWidget {
  final TAppViewProps props;

  const ZipViewerWidget({super.key, required this.props});

  @override
  Widget build(BuildContext context) {
    return PFWidget<_Archive>(
      props: props,
      computeState: (NativeApp app, Uint8List data, String _) async {
        final handle = await _openZip(app, ICOpenZipArg(data: data));
        final queried = await _queryDir(
          app,
          ICQueryDirArg(archiver: handle.data),
        );
        return _Archive(handle.data, queried);
      },
      builder: (_Archive archiver) {
        return _CoreWidget(archiver: archiver);
      },
    );
  }
}

class _CoreWidget extends StatelessWidget {
  final _Archive archiver;

  const _CoreWidget({required this.archiver});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [Expanded(child: _FileTreeView(archive: archiver))],
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
        return _TreeNodeWidget(node: rootNode.children[index], level: 0);
      },
    );
  }
}

class _TreeNodeWidget extends StatelessWidget {
  final _FileTreeNode node;
  final int level;

  const _TreeNodeWidget({super.key, required this.node, required this.level});

  @override
  Widget build(BuildContext context) {
    return node.isDirectory
        ? _DirectoryTreeNodeWidget(
            key: Key(node.path),
            node: node,
            level: level,
          )
        : _FileTreeNodeWidget(key: Key(node.path), node: node, level: level);
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

class _DirectoryTreeNodeWidget extends StatefulWidget {
  final _FileTreeNode node;
  final int level;

  const _DirectoryTreeNodeWidget({
    super.key,
    required this.node,
    required this.level,
  });

  @override
  State<_DirectoryTreeNodeWidget> createState() =>
      _DirectoryTreeNodeWidgetState();
}

class _DirectoryTreeNodeWidgetState extends State<_DirectoryTreeNodeWidget> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    assert(widget.node.isDirectory);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () {
            setState(() {
              _isExpanded = !_isExpanded;
            });
          },
          child: Padding(
            padding: EdgeInsets.only(left: 16.0 * widget.level),
            child: Row(
              children: [
                Icon(
                  _isExpanded
                      ? Icons.keyboard_arrow_down
                      : Icons.keyboard_arrow_right,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Icon(Icons.folder, color: Colors.amber),
                const SizedBox(width: 8),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      widget.node.name,
                      style: TextStyle(fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded)
          ...widget.node.children.map((childNode) {
            return _TreeNodeWidget(
              key: Key(childNode.path),
              node: childNode,
              level: widget.level + 1,
            );
          }),
      ],
    );
  }
}

class _FileTreeNodeWidget extends StatefulWidget {
  final _FileTreeNode node;
  final int level;

  const _FileTreeNodeWidget({
    super.key,
    required this.node,
    required this.level,
  });

  @override
  State<_FileTreeNodeWidget> createState() => _FileTreeNodeWidgetState();
}

class _FileTreeNodeWidgetState extends State<_FileTreeNodeWidget> {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FileEntryWidget(
          getResource: () async {
            final app = Provider.of<NativeApp>(context, listen: false);
            final model = Provider.of<PFModel<_Archive>>(context, listen: false);
            final fileName = widget.node.name;
            final archiver = model.state;

            final ret = await _loadFile(
              app,
              ICLoadFileArg(archiver: archiver.handle, path: widget.node.path),
            );

            return (ret.data, fileName);
          },
          child: Padding(
            padding: EdgeInsets.only(left: 16.0 * widget.level),
            child: Row(
              children: [
                const SizedBox(width: 20),
                const SizedBox(width: 8),
                Icon(Icons.insert_drive_file, color: Colors.blueGrey),
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
      ],
    );
  }
}
