import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:handy_online_tools/utils/keyboard.dart';
import 'package:super_clipboard/super_clipboard.dart';
import 'package:file_saver/file_saver.dart';

class _ClipboardItemData {
  final DataFormat format;
  final int? size;
  final String? content;
  final Future<Uint8List> Function()? binary;
  final Image? image;
  final String? fileName;

  _ClipboardItemData({
    required this.format,
    this.size,
    this.content,
    this.binary,
    this.image,
    this.fileName,
  });
}

class ClipboardInspectorWidget extends StatefulWidget {
  const ClipboardInspectorWidget({super.key});

  @override
  State<ClipboardInspectorWidget> createState() =>
      _ClipboardInspectorWidgetState();
}

class _ClipboardInspectorWidgetState extends State<ClipboardInspectorWidget> {
  List<_ClipboardItemData> clipboardItems = [];
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    // Set up keyboard shortcut listener
    ServicesBinding.instance.keyboard.addHandler(_handleKeyEvent);

    final events = ClipboardEvents.instance;
    events?.registerPasteEventListener((event) async {
      final reader = await event.getClipboardReader();
      await _handleClipboardReader(reader);
    });
  }

  @override
  void dispose() {
    ServicesBinding.instance.keyboard.removeHandler(_handleKeyEvent);
    super.dispose();
  }

  Future<void> _withLoading(Future<void> Function() f) async {
    setState(() {
      isLoading = true;
    });
    try {
      await f();
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  bool _handleKeyEvent(KeyEvent event) {
    switch (event) {
      case KeyDownEvent():
        if (isSecondaryDown(event) &&
            event.logicalKey == LogicalKeyboardKey.keyV &&
            ClipboardEvents.instance == null) {
          _pasteFromClipboard();
          return true;
        }
    }
    return false;
  }

  Future<void> _handleClipboardReader(ClipboardReader reader) async {
    List<_ClipboardItemData> items = [];
    for (final format in Formats.standardFormats) {
      if (!reader.canProvide(format)) {
        continue;
      }

      if (format is SimpleValueFormat<String>) {
        final v = await reader.readValue(format);
        items.add(
          _ClipboardItemData(format: format, size: v?.length, content: v),
        );
      } else if (format is FileFormat) {
        final file = await () {
          final completer = Completer<DataReaderFile?>();
          reader.getFile(
            format,
            (file) async {
              completer.complete(file);
            },
            onError: (error) {
              completer.complete(null);
            },
          );
          return completer.future;
        }();

        final image = await () async {
          if (file == null) {
            return null;
          }

          switch (format) {
            case Formats.png:
            case Formats.jpeg:
            case Formats.webp:
            case Formats.gif:
            case Formats.heic:
            case Formats.heif:
              {
                try {
                  final bytes = await file.readAll();
                  return Image.memory(bytes, fit: BoxFit.contain);
                } catch (e) {
                  return null;
                }
              }
            default:
              return null;
          }
        }();

        final readBinary = file == null
            ? null
            : () async {
                return file.readAll();
              };

        items.add(
          _ClipboardItemData(
            format: format,
            size: file?.fileSize,
            fileName: file?.fileName,
            binary: readBinary,
            image: image,
          ),
        );
      } else {
        items.add(_ClipboardItemData(format: format));
      }
    }
    setState(() {
      clipboardItems = items;
    });
  }

  Future<void> _pasteFromClipboard() async {
    await _withLoading(() async {
      final reader = await SystemClipboard.instance?.read();
      if (reader != null) {
        _handleClipboardReader(reader);
      }
      ServicesBinding.instance.keyboard.removeHandler(_handleKeyEvent);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (isLoading)
          const Center(child: CircularProgressIndicator())
        else if (clipboardItems.isEmpty)
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: ElevatedButton.icon(
                      onPressed: _pasteFromClipboard,
                      icon: const Icon(Icons.paste),
                      label: const Text('Paste from Clipboard'),
                    ),
                  ),
                  Text(
                    'No clipboard content to display. Press Ctrl+V or click the Paste button.',
                  ),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: _ClipboardItemsGrid(items: clipboardItems),
            ),
          ),
      ],
    );
  }
}

class _ClipboardItemsGrid extends StatelessWidget {
  final List<_ClipboardItemData> items;

  const _ClipboardItemsGrid({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate how many cards can fit in a row
        final cardWidth = 300.0;
        final cardsPerRow = (constraints.maxWidth / cardWidth).floor();
        final actualCardsPerRow = cardsPerRow > 0 ? cardsPerRow : 1;

        return GridView.builder(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: actualCardsPerRow,
            childAspectRatio: cardWidth / 250,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            return _ClipboardItemCard(item: items[index]);
          },
        );
      },
    );
  }
}

class _ClipboardItemCard extends StatelessWidget {
  final _ClipboardItemData item;

  const _ClipboardItemCard({super.key, required this.item});

  String _formatSize(int size) {
    if (size < 1024) {
      return '$size B';
    } else if (size < 1024 * 1024) {
      return '${(size / 1024).toStringAsFixed(1)} KB';
    } else {
      return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
  }

  String _inferExt(DataFormat format) {
    switch (format) {
      case Formats.htmlText:
        return "html";
      case Formats.plainText:
        return "txt";
      case Formats.png:
        return "png";
      case Formats.jpeg:
        return "jpeg";
      case Formats.webp:
        return "webp";
      default:
        return "bin";
    }
  }

  String _truncateText(String text, int maxLength) {
    return text.length <= maxLength
        ? text
        : '${text.substring(0, maxLength)}...';
  }

  Future<void> _downloadFile(BuildContext context) async {
    final fileName =
        item.fileName ??
        'clipboard_${DateTime.now().millisecondsSinceEpoch}.${_inferExt(item.format)}';

    final data = await () async {
      if (item.content != null) {
        return utf8.encode(item.content!);
      } else if (item.binary != null) {
        return item.binary!();
      } else {
        throw Exception("unreachable");
      }
    }();

    await FileSaver.instance.saveFile(
      name: fileName,
      bytes: data,
      mimeType: MimeType.other,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    item.format.toString(),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (item.binary != null || item.content != null)
                  IconButton(
                    icon: const Icon(Icons.download),
                    tooltip: 'Download',
                    onPressed: () => _downloadFile(context),
                  ),
              ],
            ),
            if (item.size != null) Text('Size: ${_formatSize(item.size!)}'),
            if (item.fileName != null)
              Text(
                'File: ${item.fileName}',
                style: const TextStyle(fontStyle: FontStyle.italic),
                overflow: TextOverflow.ellipsis,
              ),
            const Divider(),
            Expanded(child: _buildContentPreview()),
          ],
        ),
      ),
    );
  }

  Widget _buildContentPreview() {
    // Image preview
    if (item.image != null) {
      return Center(child: item.image);
    }

    // Text preview
    if (item.content != null) {
      return SingleChildScrollView(
        child: Text(
          _truncateText(item.content!, 500),
          style: const TextStyle(fontFamily: 'monospace'),
        ),
      );
    }

    if (item.binary != null) {
      // Binary data (no preview)
      return const Center(child: Text('Binary data (no preview available)'));
    }

    return const Center(child: Text('Unsupported data'));
  }
}
