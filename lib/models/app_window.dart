import 'dart:math';

import 'package:fixnum/fixnum.dart';
import 'package:flutter/widgets.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';
import 'package:handy_online_tools/models/app.dart';

class TAppWindow {
  final Int64 id;
  final TApp app;
  final TAppExternal? external;

  String name = "";
  Rectangle<double> bounds = Rectangle(1, 1, 1, 1);

  TAppWindow({required this.id, required this.app, required this.external});
}

class TAppWindowsModel extends ChangeNotifier {
  Int64 _allocated = Int64(0);
  final List<TAppWindow> appWins = List.empty(growable: true);

  void remove(Int64 id) {
    appWins.removeWhere((appWin) => appWin.id == id);
    notifyListeners();
  }

  void create(TApp app, TAppExternal? external) {
    final id = _allocated + 1;
    _allocated += 1;

    final win = TAppWindow(id: id, app: app, external: external);
    win.name = app.name;
    win.bounds = Rectangle(10, 10, app.defaultSize.x, app.defaultSize.y);
    appWins.add(win);
    notifyListeners();
  }

  void activate(Int64 id) {
    if (appWins.isNotEmpty && appWins.last.id == id) {
      return;
    }

    final winIndex = appWins.indexWhere((appWin) => appWin.id == id);
    if (winIndex != -1) {
      final win = appWins[winIndex];
      appWins.removeAt(winIndex);
      appWins.add(win);
      notifyListeners();
    }
  }
}

class TAppWindowModel extends ChangeNotifier {
  final TAppWindow appWin;

  TAppWindowModel({required this.appWin});

  void updateBounds(Rectangle<double> bounds) {
    appWin.bounds = bounds;
    notifyListeners();
  }

  void setTitle(String name) {
    appWin.name = name;
    notifyListeners();
  }
}
