import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/pkgs/code_viewer/find.dart';
import 'package:handy_online_tools/pkgs/code_viewer/json.dart';

import 'package:handy_online_tools/widgets/pending_file.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:re_editor/re_editor.dart';
import 'package:re_highlight/languages/json.dart';
import 'package:re_highlight/styles/atom-one-light.dart';

String _format(String text) {
  var formatted = tryFormatJson(text);
  if (formatted != null) {
    return formatted;
  }
  return text;
}

class CodeViewerWidget extends StatelessWidget {
  final TAppViewProps props;

  const CodeViewerWidget({super.key, required this.props});

  @override
  Widget build(BuildContext context) {
    return PFWidget<String>(
      props: props,
      computeState: (NativeApp app, Uint8List data, String _) async {
        return _format(utf8.decode(data));
      },
      builder: (String codeText) {
        return _CoreWidget(codeText: codeText,);
      },
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
