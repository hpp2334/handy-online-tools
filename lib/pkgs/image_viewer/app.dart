import 'dart:typed_data';

import 'package:desktop_drop/desktop_drop.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/archiver.pb.dart';
import 'package:handy_online_tools/models/app_window.dart';

const String _pkgId = "hol.image_viewer";

class _Image {
  final String name;
  final Uint8List data;

  _Image({required this.name, required this.data});
}

enum _Status { pending, success, error }

class _Model extends ChangeNotifier {
  _Status _status = _Status.pending;
  String? _errorMessage;
  _Image? _image;

  _Status get status => _status;
  _Image get image => _image!;
  String get errorMessage => _errorMessage!;

  Future<void> handleDrop(NativeApp app, DropItem item) async {
    try {
      final data = await item.readAsBytes();
      _image = _Image(name: item.name, data: data);
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

class ImageViewerWidget extends StatefulWidget {
  const ImageViewerWidget({super.key});

  @override
  State<ImageViewerWidget> createState() => _ImageViewerWidgetState();
}

class _ImageViewerWidgetState extends State<ImageViewerWidget> {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => _Model(),
      child: Consumer<_Model>(
        builder: (context, model, _) {
          switch (model.status) {
            case _Status.pending:
              return const _PendingWidget();
            case _Status.success:
              return _CoreWidget(image: model.image);
            case _Status.error:
              return _ErrorWidget(errorMessage: model.errorMessage);
          }
        },
      ),
    );
  }
}

class _PendingWidget extends StatefulWidget {
  const _PendingWidget({Key? key}) : super(key: key);

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

        if (!context.mounted) return;

        if (model.status == _Status.success) {
          Provider.of<TAppWindowModel>(
            context,
            listen: false,
          ).setTitle(file.name);
        }
      },
      onDragEntered: (_) => setState(() => _dragging = true),
      onDragExited: (_) => setState(() => _dragging = false),
      child: Container(
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_upload, size: 50),
            const SizedBox(height: 16),
            _dragging
                ? const Text("Release to open image")
                : const Text("Drag and drop an image here"),
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
            style: const TextStyle(color: Colors.red),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: model.reset, child: const Text("Close")),
        ],
      ),
    );
  }
}

class _CoreWidget extends StatelessWidget {
  final _Image image;

  const _CoreWidget({required this.image});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: InteractiveViewer(
        panEnabled: true,
        minScale: 0.5,
        maxScale: 5.0,
        child: Image.memory(image.data, fit: BoxFit.contain),
      ),
    );
  }
}
