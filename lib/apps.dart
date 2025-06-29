import 'dart:math';

import 'package:fixnum/fixnum.dart';
import 'package:flutter/material.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/pkgs/zip_viewer/app.dart';

void initTApps(TAppRegistryModel m) {
  m.add(
    TApp(
      id: Int64(1),
      name: "Zip Viewer",
      defaultSize: Point(300, 600),
      extensions: [".zip", ".7z"],
      iconData: Icons.folder_zip,
      render: (props) => ZipViewerWidget(),
    ),
  );
}
