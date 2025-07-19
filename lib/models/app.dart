import 'dart:collection';
import 'dart:math';

import 'package:flutter/widgets.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';

class TAppExternal {
  final TBlobResource resource;
  final String fileName;

  TAppExternal({required this.resource, required this.fileName});
}

class TAppViewProps {
  TAppExternal? external;

  TAppViewProps({required this.external});
}

typedef TAppRender = Widget Function(TAppViewProps);

class TApp {
  final int id;
  final String name;
  final Point<double> defaultSize;
  final List<String> extensions;
  final IconData iconData;
  final TAppRender render;

  TApp({
    required this.id,
    required this.name,
    required this.defaultSize,
    required this.extensions,
    required this.iconData,
    required this.render,
  });
}

class TAppRegistryModel extends ChangeNotifier {
  final HashMap<int, TApp> _map = HashMap();

  void add(TApp app) {
    _map[app.id] = app;
  }

  List<TApp> list() {
    return _map.values.toList();
  }

  TApp? recommendApp(String filename) {
    final lower = filename.toLowerCase();
    for (final app in _map.values) {
      for (final ext in app.extensions) {
        if (lower.endsWith(ext)) {
          return app;
        }
      }
    }
    return null;
  }
}
