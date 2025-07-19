import 'dart:math';

import 'package:flutter/material.dart';
import 'package:handy_online_tools/core/app_window.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:handy_online_tools/pkgs/clipboard_inspector/app.dart';
import 'package:handy_online_tools/pkgs/image_viewer/app.dart';
import 'package:handy_online_tools/pkgs/code_viewer/app.dart';
import 'package:handy_online_tools/pkgs/zip_viewer/app.dart';
import 'package:provider/provider.dart';

void initTApps(TAppRegistryModel m) {
  m.add(
    TApp(
      id: 1,
      name: "Zip Viewer",
      defaultSize: Point(300, 600),
      extensions: [".zip", ".7z"],
      iconData: Icons.folder_zip,
      render: (props) => ZipViewerWidget(),
    ),
  );
  m.add(
    TApp(
      id: 2,
      name: "Image Viewer",
      defaultSize: Point(800, 600),
      extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      iconData: Icons.image,
      render: (props) => ImageViewerWidget(props: props),
    ),
  );
  m.add(
    TApp(
      id: 3,
      name: "Code Viewer",
      defaultSize: Point(800, 600),
      extensions: [
        ".txt",
        ".json",
        ".yml",
        ".yaml",
        ".dart",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".rs",
        ".py",
        ".proto",
        ".java",
        ".kt",
      ],
      iconData: Icons.data_object,
      render: (props) => CodeViewerWidget(props: props),
    ),
  );
  m.add(
    TApp(
      id: 4,
      name: "Clipboard Inspector",
      defaultSize: Point(800, 600),
      extensions: [],
      iconData: Icons.paste,
      render: (props) => ClipboardInspectorWidget(),
    ),
  );
}

class TAppsPage extends StatefulWidget {
  const TAppsPage({super.key});

  @override
  State<TAppsPage> createState() => _TAppsPageState();
}

class _TAppsPageState extends State<TAppsPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: Stack(
        children: [
          Consumer<TAppRegistryModel>(
            builder: (cx, model, _) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Wrap(
                  spacing: 16.0, // Horizontal spacing
                  runSpacing: 16.0, // Vertical spacing
                  children: [
                    ...model.list().map((app) {
                      return SizedBox(
                        width: 120.0, // Fixed width for each item
                        height: 120.0, // Fixed height for each item
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            border: Border.all(
                              color: Colors.grey, // Solid border
                              width: 1.0,
                            ),
                            borderRadius: BorderRadius.circular(
                              4.0,
                            ), // Optional: add some corner radius
                          ),
                          child: InkWell(
                            onTap: () {
                              Provider.of<TAppWindowsModel>(
                                context,
                                listen: false,
                              ).create(app, null);
                            },
                            hoverColor: Colors.grey.withValues(
                              alpha: 0.1,
                            ), // Slight background on hover
                            child: Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    app.iconData,
                                    size: 48.0, // Fixed icon size
                                  ),
                                  const SizedBox(height: 8.0),
                                  Text(
                                    app.name,
                                    textAlign: TextAlign.center,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              );
            },
          ),
          Positioned(
            child: Consumer<TAppWindowsModel>(
              builder: (cx, model, _) {
                return Stack(
                  children: [
                    ...model.appWins.map((appWin) {
                      return ChangeNotifierProvider(
                        create: (cx) => TAppWindowModel(appWin: appWin),
                        child: TAppWindowWidget(
                          child: appWin.app.render(
                            TAppViewProps(external: appWin.external),
                          ),
                        ),
                      );
                    }),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
