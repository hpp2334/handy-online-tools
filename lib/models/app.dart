import 'dart:collection';
import 'dart:math';

import 'package:fixnum/fixnum.dart';
import 'package:flutter/widgets.dart';

class TAppViewProps {}

typedef TAppRender = Widget Function(TAppViewProps);

class TApp {
  final Int64 id;
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
  final HashMap<Int64, TApp> _map = HashMap();

  void add(TApp app) {
    _map[app.id] = app;
  }

  List<TApp> list() {
    return _map.values.toList();
  }
}
