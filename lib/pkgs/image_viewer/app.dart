import 'dart:typed_data';

import 'package:desktop_drop/desktop_drop.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/pkgs/blob/command.dart';
import 'package:handy_online_tools/pkgs/widgets/file_picker.dart';
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

  Future<bool> handleDrop(NativeApp app, PickerBlob item) async {
    try {
      final data = await item.readAsBytes();
      _image = _Image(name: item.name, data: data);
      _status = _Status.success;
    } catch (e) {
      _errorMessage = e.toString();
      _status = _Status.error;
    }
    notifyListeners();
    return _status == _Status.success;
  }

  Future<bool> handleExternal(NativeApp app, TAppExternal external) async {
    try {
      final data = await loadBlob(app, ICLoadBlobArg(data: external.resource));
      _image = _Image(name: external.fileName, data: data);
      _status = _Status.success;
    } catch (e) {
      _errorMessage = e.toString();
      _status = _Status.error;
    }
    notifyListeners();
    return _status == _Status.success;
  }

  void reset() {
    _status = _Status.pending;
    notifyListeners();
  }
}

class ImageViewerWidget extends StatefulWidget {
  final TAppViewProps props;

  const ImageViewerWidget({super.key, required this.props});

  @override
  State<ImageViewerWidget> createState() => _ImageViewerWidgetState();
}

class _ImageViewerWidgetState extends State<ImageViewerWidget> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) {
        final model = _Model();
        if (widget.props.external != null) {
          final app = Provider.of<NativeApp>(context, listen: false);
          model.handleExternal(app, widget.props.external!);
        }
        return model;
      },
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
  @override
  Widget build(BuildContext context) {
    return FilePicker(
      handleFile: (PickerBlob file) async {
        final app = Provider.of<NativeApp>(context, listen: false);
        final model = Provider.of<_Model>(context, listen: false);
        return await model.handleDrop(app, file);
      },
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

class _CoreWidget extends StatefulWidget {
  final _Image image;

  const _CoreWidget({required this.image});

  @override
  State<_CoreWidget> createState() => _CoreWidgetState();
}

class _CoreWidgetState extends State<_CoreWidget> {
  late TransformationController _controller;
  double _currentScale = 1.0;

  @override
  void initState() {
    super.initState();
    _controller = TransformationController();
    _controller.addListener(_onTransformChanged);
  }

  void _onTransformChanged() {
    final matrix = _controller.value;
    final scale = matrix.getMaxScaleOnAxis();

    setState(() {
      _currentScale = scale;
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_onTransformChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Center(
          child: InteractiveViewer(
            panEnabled: true,
            minScale: 0.5,
            maxScale: 5.0,
            transformationController: _controller,
            child: Image.memory(widget.image.data, fit: BoxFit.contain),
          ),
        ),
        Positioned(
          bottom: 20,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${(_currentScale * 100).toStringAsFixed(2)}%',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
