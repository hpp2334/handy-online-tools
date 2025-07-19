import 'dart:collection';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:handy_online_tools/models/app_window.dart';
import 'package:provider/provider.dart';

class TAppWindowWidget extends StatefulWidget {
  final Widget child;

  const TAppWindowWidget({super.key, required this.child});

  @override
  State<TAppWindowWidget> createState() => _TAppWindowWidgetState();
}

class _TAppWindowWidgetState extends State<TAppWindowWidget> {
  bool resizingLeft = false;
  bool resizingTop = false;
  bool resizingRight = false;
  bool resizingBottom = false;
  bool draggingBar = false;
  Offset startMousePos = Offset.zero;
  Rectangle<double> startWinBounds = Rectangle(1, 1, 1, 1);
  SystemMouseCursor cursor = SystemMouseCursors.move;

  @override
  Widget build(BuildContext context) {
    return Consumer<TAppWindowModel>(
      builder: (cx, appWinModel, child) {
        const padding = 8.0;
        const barHeight = 40.0;
        final appWin = appWinModel.appWin;
        final child = widget.child;

        return Positioned(
          left: appWin.bounds.left,
          top: appWin.bounds.top,

          child: MouseRegion(
            cursor: cursor,
            onHover: (event) {
              final dragging =
                  resizingLeft ||
                  resizingTop ||
                  resizingBottom ||
                  resizingRight ||
                  draggingBar;

              if (dragging) {
                return;
              }

              final local = event.localPosition;
              final onLeftEdge = local.dx <= 2 * padding;
              final onRightEdge = (local.dx >= appWin.bounds.width);
              final onTopEdge = local.dy <= 2 * padding;
              final onBottomEdge = (local.dy >= appWin.bounds.height);

              if (onLeftEdge && onTopEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeUpLeft;
                });
              } else if (onLeftEdge && onBottomEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeDownLeft;
                });
              } else if (onRightEdge && onTopEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeUpRight;
                });
              } else if (onRightEdge && onBottomEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeDownRight;
                });
              } else if (onLeftEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeLeftRight;
                });
              } else if (onRightEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeLeftRight;
                });
              } else if (onTopEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeUpDown;
                });
              } else if (onBottomEdge) {
                setState(() {
                  cursor = SystemMouseCursors.resizeUpDown;
                });
              } else {
                setState(() {
                  cursor = SystemMouseCursors.basic;
                });
              }
            },
            child: GestureDetector(
              onPanStart: (details) {
                final local = details.localPosition;
                final onLeftEdge = local.dx <= 2 * padding;
                final onRightEdge = (local.dx >= appWin.bounds.width);
                final onTopEdge = local.dy <= 2 * padding;
                final onBottomEdge = (local.dy >= appWin.bounds.height);
                final onBar =
                    local.dx >= padding &&
                    local.dx <= padding + appWin.bounds.width &&
                    local.dy >= padding &&
                    local.dy <= padding + barHeight;

                resizingLeft = onLeftEdge;
                resizingRight = onRightEdge;
                resizingTop = onTopEdge;
                resizingBottom = onBottomEdge;
                draggingBar = onBar;
                startMousePos = details.globalPosition;
                startWinBounds = appWin.bounds;

                Provider.of<TAppWindowsModel>(context, listen: false).activate(appWin.id);
              },
              onPanUpdate: (details) {
                final resizing =
                    resizingLeft ||
                    resizingTop ||
                    resizingBottom ||
                    resizingRight;
                if (resizing) {
                  final delta = details.globalPosition - startMousePos;
                  var nextBounds = startWinBounds;
                  if (resizingLeft) {
                    nextBounds = Rectangle<double>(
                      delta.dx + nextBounds.left,
                      nextBounds.top,
                      nextBounds.width - delta.dx,
                      nextBounds.height,
                    );
                  } else if (resizingRight) {
                    nextBounds = Rectangle<double>(
                      nextBounds.left,
                      nextBounds.top,
                      delta.dx + nextBounds.width,
                      nextBounds.height,
                    );
                  }
                  if (resizingTop) {
                    nextBounds = Rectangle<double>(
                      nextBounds.left,
                      delta.dy + nextBounds.top,
                      nextBounds.width,
                      nextBounds.height - delta.dy,
                    );
                  } else if (resizingBottom) {
                    nextBounds = Rectangle<double>(
                      nextBounds.left,
                      nextBounds.top,
                      nextBounds.width,
                      delta.dy + nextBounds.height,
                    );
                  }
                  appWinModel.updateBounds(nextBounds);
                } else if (draggingBar) {
                  final delta = details.globalPosition - startMousePos;
                  final nextBounds = Rectangle<double>(
                    startWinBounds.left + delta.dx,
                    startWinBounds.top + delta.dy,
                    startWinBounds.width,
                    startWinBounds.height,
                  );
                  appWinModel.updateBounds(nextBounds);
                  setState(() {
                    cursor = SystemMouseCursors.grabbing;
                  });
                }
              },
              onPanEnd: (_) {
                resizingLeft = false;
                resizingRight = false;
                resizingTop = false;
                resizingBottom = false;
                draggingBar = false;
              },
              child: Container(
                decoration: BoxDecoration(color: Colors.transparent),
                padding: EdgeInsets.all(padding),
                child: Container(
                  width: appWin.bounds.width,
                  height: appWin.bounds.height,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: .1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        height: barHeight,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE0E0E0),
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(12),
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(appWin.name),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: () {
                                Provider.of<TAppWindowsModel>(
                                  context,
                                  listen: false,
                                ).remove(appWin.id);
                              },
                            ),
                          ],
                        ),
                      ),
                      Expanded(child: child),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
