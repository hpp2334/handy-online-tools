import 'dart:typed_data';

import 'package:desktop_drop/desktop_drop.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

class PickerBlob {
  DropItem? dropItem;

  PickerBlob(DropItem item) {
    dropItem = item;
  }

  String get name {
    if (dropItem != null) {
      return dropItem!.name;
    }
    throw Exception("Unreachable");
  }

  Future<Uint8List> readAsBytes() async {
    if (dropItem != null) {
      return dropItem!.readAsBytes();
    }
    throw Exception("Unreachable");
  }
}

class FilePicker extends StatefulWidget {
  final Future<bool> Function(PickerBlob) handleFile;

  const FilePicker({super.key, required this.handleFile});

  @override
  State<FilePicker> createState() => _FilePickerState();
}

class _FilePickerState extends State<FilePicker> {
  bool _dragging = false;

  @override
  Widget build(BuildContext context) {
    return DropTarget(
      onDragDone: (details) async {
        if (details.files.isEmpty) {
          return;
        }
        final file = details.files.first;
        final success = await widget.handleFile(PickerBlob(file));

        if (!context.mounted) {
          return;
        }
        if (success) {
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
              const Text("Drag and drop file here")
            else
              const Text("Release to accept"),
          ],
        ),
      ),
    );
  }
}
