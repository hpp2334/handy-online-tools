import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/pkgs/blob/command.dart';
import 'package:handy_online_tools/pkgs/code_viewer/find.dart';
import 'package:handy_online_tools/pkgs/code_viewer/json.dart';

import 'package:handy_online_tools/pkgs/widgets/file_picker.dart';
import 'package:provider/provider.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:re_editor/re_editor.dart';
import 'package:re_highlight/languages/json.dart';
import 'package:re_highlight/styles/atom-one-light.dart';

enum _Status { pending, success, error }

String _format(String text) {
  if (maybeJson(text)) {
    return formatJson(text);
  }
  return text;
}

class _Model extends ChangeNotifier {
  _Status _status = _Status.pending;
  String? _errorMessage;
  String? _codeText;

  _Status get status => _status;
  String get codeText => _codeText!;
  String get errorMessage => _errorMessage!;

  Future<bool> handleDrop(NativeApp app, PickerBlob item) async {
    try {
      final data = await item.readAsBytes();
      _codeText = _format(utf8.decode(data));
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
      _codeText = _format(utf8.decode(data));
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

class CodeViewerWidget extends StatefulWidget {
  final TAppViewProps props;

  const CodeViewerWidget({super.key, required this.props});

  @override
  State<CodeViewerWidget> createState() => _CodeViewerWidgetState();
}

class _CodeViewerWidgetState extends State<CodeViewerWidget> {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) {
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
              return _CoreWidget(codeText: model.codeText);
            case _Status.error:
              return _ErrorWidget(errorMessage: model.errorMessage);
          }
        },
      ),
    );
  }
}

class _PendingWidget extends StatefulWidget {
  const _PendingWidget();

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
  final String codeText;

  const _CoreWidget({required this.codeText});

  @override
  State<_CoreWidget> createState() => _CoreWidgetState();
}

class _CoreWidgetState extends State<_CoreWidget> {
  late CodeLineEditingController controller;

  @override
  void initState() {
    super.initState();
    controller = CodeLineEditingController.fromText(widget.codeText);
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const readOnly = true;

    return CodeEditor(
      controller: controller,
      readOnly: readOnly,
      style: CodeEditorStyle(
        codeTheme: CodeHighlightTheme(
          languages: {'json': CodeHighlightThemeMode(mode: langJson)},
          theme: atomOneLightTheme,
        ),
        fontFamily: "RobotoMono",
      ),
      chunkAnalyzer: DefaultCodeChunkAnalyzer(),
      findBuilder: (context, controller, readOnly) =>
          CodeFindPanelView(controller: controller, readOnly: readOnly),
    );
  }
}
