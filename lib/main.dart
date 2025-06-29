import 'package:flutter/material.dart';
import 'package:handy_online_tools/apps.dart';
import 'package:handy_online_tools/core/app_window.dart';
import 'package:handy_online_tools/models/app.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

void main() {
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
              return GridView.count(
                crossAxisCount:
                    6, // You can adjust the number of columns as needed
                padding: const EdgeInsets.all(16.0),
                mainAxisSpacing: 16.0,
                crossAxisSpacing: 16.0,
                children: [
                  ...model.list().map((app) {
                    return IconButton(
                      icon: Icon(app.iconData),
                      onPressed: () {
                        Provider.of<TAppWindowsModel>(
                          context,
                          listen: false,
                        ).create(app);
                      },
                      tooltip: app.name,
                    );
                  }),
                ],
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
                          child: appWin.app.render(TAppViewProps()),
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
