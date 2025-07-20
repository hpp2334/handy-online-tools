import 'dart:typed_data';

import 'package:desktop_drop/desktop_drop.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

class PickerBlob {
  DropItem? dropItem;
  PlatformFile? platformFile;

  PickerBlob();

  factory PickerBlob.fromDropItem(DropItem item) {
    final ret = PickerBlob();
    ret.dropItem = item;
    return ret;
  }
  factory PickerBlob.fromFilePicker(PlatformFile file) {
    assert(file.bytes != null);
    final ret = PickerBlob();
    ret.platformFile = file;
    return ret;
  }

  String get name {
    if (dropItem != null) {
      return dropItem!.name;
    }
    if (platformFile != null) {
      return platformFile!.name;
    }
    throw Exception("Unreachable");
  }

  Future<Uint8List> readAsBytes() async {
    if (dropItem != null) {
      return dropItem!.readAsBytes();
    }
    if (platformFile != null) {
      return platformFile!.bytes!;
    }

    throw Exception("Unreachable");
  }
}

class FilePickerWidget extends StatefulWidget {
  final Future<bool> Function(PickerBlob) handleFile;

  const FilePickerWidget({super.key, required this.handleFile});

  @override
  State<FilePickerWidget> createState() => _FilePickerWidgetState();
}

class _FilePickerWidgetState extends State<FilePickerWidget> {
  bool _dragging = false;

  Future<void> handlePickerBlob(BuildContext context, PickerBlob blob) async {
    await widget.handleFile(blob);
  }

  @override
  Widget build(BuildContext context) {
    return DropTarget(
      onDragDone: (details) async {
        if (details.files.isEmpty) {
          return;
        }
        final file = details.files.first;
        await handlePickerBlob(context, PickerBlob.fromDropItem(file));
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
      child: InkWell(
        onTap: () async {
          final result = await FilePicker.platform.pickFiles();
          if (context.mounted && result != null && result.files.isNotEmpty) {
            final file = result.files.first;
            if (file.bytes != null) {
              await handlePickerBlob(context, PickerBlob.fromFilePicker(file));
            }
          }
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
      ),
    );
  }
}
