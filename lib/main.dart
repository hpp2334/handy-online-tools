import 'package:flutter/material.dart';
import 'package:handy_online_tools/apps.dart';
import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

void main() async {
  final r = await getRustLibs();
  r.greet();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (cx) {
            final m = TAppRegistryModel();
            initTApps(m);
            return m;
          },
        ),
        ChangeNotifierProvider(create: (cx) => TAppWindowsModel()),
      ],
      child: const HolApp(),
    ),
  );
}

class HolApp extends StatelessWidget {
  const HolApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Handy Online Tools',
      debugShowCheckedModeBanner: false,
      home: const TAppsPage(),
    );
  }
}
