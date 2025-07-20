import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:handy_online_tools/pkgs/blob/command.dart';
import 'package:handy_online_tools/widgets/file_picker.dart';
import 'package:provider/provider.dart';

enum _Status { loading, pending, success, error }

typedef ComputeState<T> = Future<T> Function(NativeApp, Uint8List, String);

class PFModel<T> extends ChangeNotifier {
  final ComputeState<T> _computeState;
  _Status _status = _Status.pending;
  String? _errorMessage;
  T? _state;

  PFModel({required ComputeState<T> computeState})
    : _computeState = computeState;

  T get state => _state!;

  Future<bool> _loadAndCompute(
    BuildContext context,
    NativeApp app,
    Future<Uint8List> Function() loadData,
    String name,
  ) async {
    final win = Provider.of<TAppWindowModel>(context, listen: false);
    _status = _Status.loading;
    notifyListeners();

    try {
      final data = await loadData();
      _state = await _computeState(app, data, name);
      _status = _Status.success;
    } catch (e) {
      _errorMessage = e.toString();
      _status = _Status.error;
    }
    notifyListeners();

    win.setTitle(name);
    return _status == _Status.success;
  }

  Future<bool> handleDrop(BuildContext context,NativeApp app, PickerBlob item) async =>
      _loadAndCompute(context, app, () => item.readAsBytes(), item.name);

  Future<bool> handleExternal(BuildContext context, NativeApp app, TAppExternal external) async =>
      _loadAndCompute(
        context,
        app,
        () => loadBlob(app, ICLoadBlobArg(data: external.resource)),
        external.fileName,
      );

  void reset() {
    _status = _Status.pending;
    notifyListeners();
  }
}

class PFWidget<T> extends StatelessWidget {
  final TAppViewProps props;
  final ComputeState<T> computeState;
  final Widget Function(T) builder;

  const PFWidget({
    super.key,
    required this.props,
    required this.computeState,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) {
        final model = PFModel<T>(computeState: computeState);
        if (props.external != null) {
          final app = Provider.of<NativeApp>(context, listen: false);
          model.handleExternal(context, app, props.external!);
        }
        return model;
      },
      child: Consumer<PFModel<T>>(
        builder: (context, model, _) {
          switch (model._status) {
            case _Status.pending:
              return _PendingWidget<T>();
            case _Status.loading:
              return const _LoadingWidget();
            case _Status.success:
              return builder(model.state);
            case _Status.error:
              return _ErrorWidget<T>(errorMessage: model._errorMessage!);
          }
        },
      ),
    );
  }
}

class _LoadingWidget extends StatelessWidget {
  const _LoadingWidget();

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}

class _PendingWidget<T> extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FilePickerWidget(
      handleFile: (PickerBlob file) async {
        final app = Provider.of<NativeApp>(context, listen: false);
        final model = Provider.of<PFModel<T>>(context, listen: false);
        return await model.handleDrop(context, app, file);
      },
    );
  }
}

class _ErrorWidget<T> extends StatelessWidget {
  final String errorMessage;

  const _ErrorWidget({required this.errorMessage});

  @override
  Widget build(BuildContext context) {
    final model = Provider.of<PFModel<T>>(context, listen: false);
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
