import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/widgets/pending_file.dart';
import 'package:handy_online_tools/core/rust_libs.dart';

class _Image {
  final String name;
  final Uint8List data;

  _Image({required this.name, required this.data});
}

class ImageViewerWidget extends StatelessWidget {
  final TAppViewProps props;

  const ImageViewerWidget({super.key, required this.props});

  @override
  Widget build(BuildContext context) {
    return PFWidget<_Image>(
      props: props,
      computeState: (NativeApp app, Uint8List data, String fileName) async {
        return _Image(name: fileName, data: data);
      },
      builder: (_Image image) {
        return _CoreWidget(image: image);
      },
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
