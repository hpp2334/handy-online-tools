import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:handy_online_tools/pkgs/widgets/file_picker.dart';
import 'package:provider/provider.dart';
import 'package:handy_online_tools/core/rust_libs.dart';

enum _Status { pending, success, error }

class _Model extends ChangeNotifier {
  _Status _status = _Status.pending;
  String? _errorMessage;
  String? _jsonText;

  _Status get status => _status;
  String get jsonText => _jsonText!;
  String get errorMessage => _errorMessage!;

  Future<bool> handleDrop(NativeApp app, PickerBlob item) async {
    try {
      final data = await item.readAsBytes();
      _jsonText = utf8.decode(data);
      json.decode(_jsonText!);
      _status = _Status.success;
    } catch (e) {
      _errorMessage = e.toString();
      _status = _Status.error;
    }
    notifyListeners();
    return _status == _Status.success;
  }

  void reset() {
    _status = _Status.pending;
    notifyListeners();
  }
}

class JsonViewerWidget extends StatefulWidget {
  const JsonViewerWidget({super.key});

  @override
  State<JsonViewerWidget> createState() => _JsonViewerWidgetState();
}

class _JsonViewerWidgetState extends State<JsonViewerWidget> {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => _Model(),
      child: Consumer<_Model>(
        builder: (context, model, _) {
          switch (model.status) {
            case _Status.pending:
              return const _PendingWidget();
            case _Status.success:
              return _CoreWidget(jsonText: model.jsonText);
            case _Status.error:
              return _ErrorWidget(errorMessage: model.errorMessage);
          }
        },
      ),
    );
  }
}

class _PendingWidget extends StatefulWidget {
  const _PendingWidget();

  @override
  State<_PendingWidget> createState() => _PendingWidgetState();
}

class _PendingWidgetState extends State<_PendingWidget> {
  @override
  Widget build(BuildContext context) {
    return FilePicker(
      handleFile: (PickerBlob file) async {
        final app = Provider.of<NativeApp>(context, listen: false);
        final model = Provider.of<_Model>(context, listen: false);
        return await model.handleDrop(app, file);
      },
    );
  }
}

class _ErrorWidget extends StatelessWidget {
  final String errorMessage;

  const _ErrorWidget({required this.errorMessage});

  @override
  Widget build(BuildContext context) {
    final model = Provider.of<_Model>(context, listen: false);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 50, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            errorMessage,
            style: const TextStyle(color: Colors.red),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: model.reset, child: const Text("Close")),
        ],
      ),
    );
  }
}

// Global class to track all search matches across the tree
class _SearchResults {
  static final List<GlobalKey> matchKeys = [];
  static int currentMatchIndex = -1;

  static void reset() {
    matchKeys.clear();
    currentMatchIndex = -1;
  }

  static void registerMatch(GlobalKey key) {
    if (!matchKeys.contains(key)) {
      matchKeys.add(key);
    }
  }

  static bool hasMatches() {
    return matchKeys.isNotEmpty;
  }

  static int matchCount() {
    return matchKeys.length;
  }

  static void navigateToNext() {
    if (matchKeys.isEmpty) return;

    currentMatchIndex = (currentMatchIndex + 1) % matchKeys.length;
    _scrollToCurrentMatch();
  }

  static void navigateToPrevious() {
    if (matchKeys.isEmpty) return;

    currentMatchIndex =
        (currentMatchIndex - 1 + matchKeys.length) % matchKeys.length;
    _scrollToCurrentMatch();
  }

  static void _scrollToCurrentMatch() {
    if (currentMatchIndex >= 0 && currentMatchIndex < matchKeys.length) {
      final context = matchKeys[currentMatchIndex].currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          alignment: 0.5,
          duration: const Duration(milliseconds: 300),
        );
      }
    }
  }
}

class _CoreWidget extends StatefulWidget {
  final String jsonText;

  const _CoreWidget({required this.jsonText});

  @override
  State<_CoreWidget> createState() => _CoreWidgetState();
}

class _CoreWidgetState extends State<_CoreWidget> {
  late dynamic _json;
  final FocusNode _focusNode = FocusNode();
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _showSearchBar = false;
  String _searchText = '';
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _json = json.decode(widget.jsonText);

    // Setup keyboard shortcuts
    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        ServicesBinding.instance.keyboard.addHandler(_handleKeyPress);
      } else {
        ServicesBinding.instance.keyboard.removeHandler(_handleKeyPress);
      }
    });

    _searchController.addListener(() {
      if (_searchController.text != _searchText) {
        setState(() {
          _searchText = _searchController.text;
          _isSearching = true;
          _SearchResults.reset();
        });

        // Allow time for search results to register
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            setState(() {
              _isSearching = false;
              if (_SearchResults.hasMatches()) {
                _SearchResults.currentMatchIndex = 0;
                _SearchResults.navigateToNext();
              }
            });
          }
        });
      }
    });
  }

  bool _handleKeyPress(KeyEvent event) {
    if (event is KeyDownEvent) {
      final bool isCtrlPressed = HardwareKeyboard.instance.isControlPressed;

      if (event.logicalKey == LogicalKeyboardKey.keyF && isCtrlPressed) {
        setState(() {
          _showSearchBar = !_showSearchBar;
          if (_showSearchBar) {
            FocusScope.of(context).requestFocus(_searchFocusNode);
          } else {
            _searchText = '';
            _searchController.clear();
            _SearchResults.reset();
          }
        });
        return true;
      }

      // Handle search navigation with F3 or Enter
      if (_showSearchBar &&
          (_searchText.isNotEmpty &&
              (event.logicalKey == LogicalKeyboardKey.f3 ||
                  event.logicalKey == LogicalKeyboardKey.enter))) {
        if (isCtrlPressed) {
          _SearchResults.navigateToPrevious();
        } else {
          _SearchResults.navigateToNext();
        }
        return true;
      }
    }
    return false;
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    ServicesBinding.instance.keyboard.removeHandler(_handleKeyPress);
    super.dispose();
  }

  void _expandAll(Map<String, bool> expandedNodes) {
    setState(() {
      expandedNodes.updateAll((key, value) => true);
    });
  }

  void _collapseAll(Map<String, bool> expandedNodes) {
    setState(() {
      expandedNodes.updateAll((key, value) => false);
    });
  }

  void _copyToClipboard(dynamic value) {
    String textToCopy = '';
    if (value is Map || value is List) {
      textToCopy = JsonEncoder.withIndent('  ').convert(value);
    } else {
      textToCopy = value.toString();
    }

    Clipboard.setData(ClipboardData(text: textToCopy));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Copied to clipboard')));
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      autofocus: true,
      child: GestureDetector(
        onTap: () {
          FocusScope.of(context).requestFocus(_focusNode);
        },
        child: Scaffold(
          appBar: AppBar(
            title: const Text('JSON Viewer'),
            actions: [
              IconButton(
                icon: const Icon(Icons.unfold_more),
                tooltip: 'Expand All',
                onPressed: () => _expandAll(_JsonTreeWidgetState.expandedNodes),
              ),
              IconButton(
                icon: const Icon(Icons.unfold_less),
                tooltip: 'Collapse All',
                onPressed: () =>
                    _collapseAll(_JsonTreeWidgetState.expandedNodes),
              ),
              IconButton(
                icon: const Icon(Icons.search),
                tooltip: 'Search (Ctrl+F)',
                onPressed: () {
                  setState(() {
                    _showSearchBar = !_showSearchBar;
                    if (_showSearchBar) {
                      FocusScope.of(context).requestFocus(_searchFocusNode);
                    } else {
                      _searchText = '';
                      _searchController.clear();
                      _SearchResults.reset();
                    }
                  });
                },
              ),
              IconButton(
                icon: const Icon(Icons.copy),
                tooltip: 'Copy All',
                onPressed: () => _copyToClipboard(_json),
              ),
            ],
          ),
          body: Column(
            children: [
              if (_showSearchBar)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          focusNode: _searchFocusNode,
                          decoration: InputDecoration(
                            labelText: 'Search',
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchText = '';
                                  _SearchResults.reset();
                                });
                              },
                            ),
                            border: const OutlineInputBorder(),
                          ),
                          onSubmitted: (_) {
                            if (_SearchResults.hasMatches()) {
                              _SearchResults.navigateToNext();
                            }
                          },
                        ),
                      ),
                      if (_searchText.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.navigate_before),
                          tooltip: 'Previous Match (Shift+F3)',
                          onPressed: _SearchResults.hasMatches()
                              ? _SearchResults.navigateToPrevious
                              : null,
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: _isSearching
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(
                                  _SearchResults.hasMatches()
                                      ? "${_SearchResults.currentMatchIndex + 1} of ${_SearchResults.matchCount()}"
                                      : "No matches",
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.navigate_next),
                          tooltip: 'Next Match (F3)',
                          onPressed: _SearchResults.hasMatches()
                              ? _SearchResults.navigateToNext
                              : null,
                        ),
                      ],
                    ],
                  ),
                ),
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: DefaultTextStyle(
                      style: const TextStyle(
                        fontFamily:
                            'Menlo, Monaco, Consolas, "Courier New", monospace',
                        fontSize: 14,
                      ),
                      child: _JsonTreeWidget(
                        data: _json,
                        propertyName: 'root',
                        searchText: _searchText,
                        onCopy: _copyToClipboard,
                        path: '',
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _JsonTreeWidget extends StatefulWidget {
  final dynamic data;
  final String propertyName;
  final String searchText;
  final Function(dynamic) onCopy;
  final String path;

  const _JsonTreeWidget({
    required this.data,
    required this.propertyName,
    required this.searchText,
    required this.onCopy,
    required this.path,
  });

  @override
  State<_JsonTreeWidget> createState() => _JsonTreeWidgetState();
}

class _JsonTreeWidgetState extends State<_JsonTreeWidget> {
  // Static map to maintain expanded state of all nodes
  static final Map<String, bool> expandedNodes = {};
  bool _isKeySelected = false;
  bool _isValueSelected = false;
  final GlobalKey _keyMatchKey = GlobalKey();
  final GlobalKey _valueMatchKey = GlobalKey();

  bool get isExpanded {
    final String nodePath = '${widget.path}.${widget.propertyName}';
    return expandedNodes[nodePath] ?? false;
  }

  set isExpanded(bool value) {
    final String nodePath = '${widget.path}.${widget.propertyName}';
    expandedNodes[nodePath] = value;
  }

  bool _containsSearchText(dynamic data) {
    if (widget.searchText.isEmpty) return false;

    final searchText = widget.searchText.toLowerCase();
    if (data is Map) {
      return data.keys.any(
        (key) =>
            key.toString().toLowerCase().contains(searchText) ||
            _containsSearchText(data[key]),
      );
    } else if (data is List) {
      return data.any((item) => _containsSearchText(item));
    } else {
      return data.toString().toLowerCase().contains(searchText);
    }
  }

  bool _keyContainsSearchText() {
    if (widget.searchText.isEmpty) return false;
    return widget.propertyName.toLowerCase().contains(
      widget.searchText.toLowerCase(),
    );
  }

  bool _valueContainsSearchText() {
    if (widget.searchText.isEmpty) return false;

    final value = widget.data;
    if (value is Map || value is List) {
      return _containsSearchText(value);
    }

    return value.toString().toLowerCase().contains(
      widget.searchText.toLowerCase(),
    );
  }

  void _showContextMenu(
    BuildContext context,
    Offset position, {
    bool isKey = false,
  }) {
    final RenderBox overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;

    final dynamic value = isKey ? widget.propertyName : widget.data;

    showMenu(
      context: context,
      position: RelativeRect.fromRect(
        Rect.fromPoints(position, position),
        Offset.zero & overlay.size,
      ),
      items: [
        PopupMenuItem(
          child: Row(
            children: [
              const Icon(Icons.copy, size: 16),
              const SizedBox(width: 8),
              Text(isKey ? 'Copy Key' : 'Copy Value'),
            ],
          ),
          onTap: () {
            String textToCopy = '';
            if (isKey) {
              textToCopy = widget.propertyName;
            } else if (value is Map || value is List) {
              textToCopy = JsonEncoder.withIndent('  ').convert(value);
            } else {
              textToCopy = value.toString();
            }

            Clipboard.setData(ClipboardData(text: textToCopy));
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Copied ${isKey ? 'key' : 'value'} to clipboard'),
              ),
            );
          },
        ),
        if (!isKey && (widget.data is Map || widget.data is List))
          PopupMenuItem(
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.unfold_less : Icons.unfold_more,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(isExpanded ? 'Collapse' : 'Expand'),
              ],
            ),
            onTap: () {
              setState(() {
                isExpanded = !isExpanded;
              });
            },
          ),
      ],
    );
  }

  @override
  void initState() {
    super.initState();
    _checkForMatches();
  }

  @override
  void didUpdateWidget(_JsonTreeWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.searchText != widget.searchText) {
      _checkForMatches();
    }
  }

  void _checkForMatches() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.searchText.isNotEmpty) {
        if (_keyContainsSearchText()) {
          _SearchResults.registerMatch(_keyMatchKey);
        }

        if (_valueContainsSearchText() &&
            !(widget.data is Map || widget.data is List)) {
          _SearchResults.registerMatch(_valueMatchKey);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final String nodePath = '${widget.path}.${widget.propertyName}';

    // Auto-expand if this node contains the search text
    if (widget.searchText.isNotEmpty && _containsSearchText(widget.data)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!isExpanded) {
          setState(() {
            isExpanded = true;
          });
        }
      });
    }

    // Initialize the expanded state if it doesn't exist
    if (!expandedNodes.containsKey(nodePath)) {
      expandedNodes[nodePath] = false;
    }

    return widget.data is Map || widget.data is List
        ? _buildComplexWidget(nodePath)
        : _buildSimpleWidget();
  }

  Widget _buildComplexWidget(String nodePath) {
    final isMap = widget.data is Map;
    final itemCount = isMap
        ? (widget.data as Map).length
        : (widget.data as List).length;
    final keyHasMatch = _keyContainsSearchText();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    isExpanded = !isExpanded;
                  });
                },
                child: Icon(
                  isExpanded
                      ? Icons.keyboard_arrow_down
                      : Icons.keyboard_arrow_right,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      key: keyHasMatch ? _keyMatchKey : null,
                      onSecondaryTapDown: (details) {
                        _showContextMenu(
                          context,
                          details.globalPosition,
                          isKey: true,
                        );
                      },
                      onTapDown: (_) {
                        setState(() {
                          _isKeySelected = true;
                          _isValueSelected = false;
                        });
                      },
                      onTapUp: (_) {
                        Future.delayed(const Duration(milliseconds: 200), () {
                          if (mounted) {
                            setState(() {
                              _isKeySelected = false;
                            });
                          }
                        });
                      },
                      onTapCancel: () {
                        setState(() {
                          _isKeySelected = false;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: _isKeySelected
                              ? Colors.grey.withValues(alpha: 77)
                              : (keyHasMatch
                                    ? Colors.yellow.withValues(alpha: 77)
                                    : Colors.transparent),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          widget.propertyName,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: keyHasMatch
                                ? Colors.yellow.shade800
                                : _getPropertyNameColor(widget.data),
                          ),
                        ),
                      ),
                    ),
                    GestureDetector(
                      onSecondaryTapDown: (details) {
                        _showContextMenu(context, details.globalPosition);
                      },
                      onTapDown: (_) {
                        setState(() {
                          _isKeySelected = false;
                          _isValueSelected = true;
                        });
                      },
                      onTapUp: (_) {
                        Future.delayed(const Duration(milliseconds: 200), () {
                          if (mounted) {
                            setState(() {
                              _isValueSelected = false;
                            });
                          }
                        });
                      },
                      onTapCancel: () {
                        setState(() {
                          _isValueSelected = false;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: _isValueSelected
                              ? Colors.grey.withValues(alpha: 77)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          isMap ? ' {' : ' [',
                          style: TextStyle(
                            color: _getPropertyNameColor(widget.data),
                          ),
                        ),
                      ),
                    ),
                    if (!isExpanded)
                      Text(
                        ' $itemCount items',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (isExpanded)
          Padding(
            padding: const EdgeInsets.only(left: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isMap)
                  ...(widget.data as Map).entries.map((entry) {
                    return _JsonTreeWidget(
                      data: entry.value,
                      propertyName: entry.key.toString(),
                      searchText: widget.searchText,
                      onCopy: widget.onCopy,
                      path: nodePath,
                    );
                  }),
                // Fixed the 'else' syntax error here
                ...(widget.data is List
                    ? (widget.data as List).asMap().entries.map((entry) {
                        return _JsonTreeWidget(
                          data: entry.value,
                          propertyName: entry.key.toString(),
                          searchText: widget.searchText,
                          onCopy: widget.onCopy,
                          path: nodePath,
                        );
                      })
                    : []),
                GestureDetector(
                  onSecondaryTapDown: (details) {
                    _showContextMenu(context, details.globalPosition);
                  },
                  child: Text(
                    isMap ? '}' : ']',
                    style: TextStyle(color: _getPropertyNameColor(widget.data)),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildSimpleWidget() {
    final value = widget.data;
    final keyHasMatch = _keyContainsSearchText();
    final valueHasMatch = !keyHasMatch && _valueContainsSearchText();

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: 24), // Align with tree indent
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  key: keyHasMatch ? _keyMatchKey : null,
                  onSecondaryTapDown: (details) {
                    _showContextMenu(
                      context,
                      details.globalPosition,
                      isKey: true,
                    );
                  },
                  onTapDown: (_) {
                    setState(() {
                      _isKeySelected = true;
                      _isValueSelected = false;
                    });
                  },
                  onTapUp: (_) {
                    Future.delayed(const Duration(milliseconds: 200), () {
                      if (mounted) {
                        setState(() {
                          _isKeySelected = false;
                        });
                      }
                    });
                  },
                  onTapCancel: () {
                    setState(() {
                      _isKeySelected = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: _isKeySelected
                          ? Colors.grey.withValues(alpha: 77)
                          : (keyHasMatch
                                ? Colors.yellow.withValues(alpha: 77)
                                : Colors.transparent),
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Text(
                      "${widget.propertyName}: ",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: keyHasMatch
                            ? Colors.yellow.shade800
                            : _getPropertyNameColor(value),
                      ),
                    ),
                  ),
                ),
                GestureDetector(
                  key: valueHasMatch ? _valueMatchKey : null,
                  onSecondaryTapDown: (details) {
                    _showContextMenu(context, details.globalPosition);
                  },
                  onTapDown: (_) {
                    setState(() {
                      _isKeySelected = false;
                      _isValueSelected = true;
                    });
                  },
                  onTapUp: (_) {
                    Future.delayed(const Duration(milliseconds: 200), () {
                      if (mounted) {
                        setState(() {
                          _isValueSelected = false;
                        });
                      }
                    });
                  },
                  onTapCancel: () {
                    setState(() {
                      _isValueSelected = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: _isValueSelected
                          ? Colors.grey.withValues(alpha: 77)
                          : (valueHasMatch
                                ? Colors.yellow.withValues(alpha: 77)
                                : Colors.transparent),
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Text(
                      _formatValue(value),
                      style: TextStyle(
                        color: valueHasMatch
                            ? Colors.yellow.shade800
                            : _getValueColor(value),
                        fontStyle: value == null
                            ? FontStyle.italic
                            : FontStyle.normal,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatValue(dynamic value) {
    if (value == null) {
      return 'null';
    } else if (value is String) {
      return '"$value"';
    } else {
      return value.toString();
    }
  }

  Color _getPropertyNameColor(dynamic value) {
    if (value is Map) {
      return Colors.blue;
    } else if (value is List) {
      return Colors.deepPurple;
    } else {
      return Colors.black;
    }
  }

  Color _getValueColor(dynamic value) {
    if (value == null) {
      return Colors.grey;
    } else if (value is String) {
      return Colors.green.shade800;
    } else if (value is num) {
      return Colors.blue.shade700;
    } else if (value is bool) {
      return Colors.blue.shade200;
    } else {
      return Colors.black;
    }
  }
}
