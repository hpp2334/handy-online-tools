import 'dart:js_interop';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';

extension type _WasmApp._(JSObject _) implements JSObject {
  external JSPromise<JSUint8Array> invoke_command(JSUint8Array request);
}

extension type RustLibs._(JSObject _) implements JSObject {}

@JS()
external JSPromise<_WasmApp> _createWasmApp();

class NativeApp extends ChangeNotifier {
  late final _WasmApp _app;
}

Future<NativeApp> createNativeApp() async {
  final app = await JSPromiseToFuture(_createWasmApp()).toDart;

  final ret = NativeApp();
  ret._app = app;
  return ret;
}

Future<Uint8List> _invokeCommand(NativeApp app, Uint8List request) async {
  final req = Uint8ListToJSUint8Array(request).toJS;
  final promiseRes = app._app.invoke_command(req);
  final res = await JSPromiseToFuture(promiseRes).toDart;
  return JSUint8ArrayToUint8List(res).toDart;
}

Future<R> invokeCommand<A, R>(
  NativeApp app,
  String pkgId,
  String commandName,
  A arg,
  R Function(List<int>) fromBufferR,
) async {
  final cmdArg = TInvokeCommandRequest(
    pkgId: TPackageId(identifier: pkgId),
    commandId: TCommandId(name: commandName),
    arguments: (arg as dynamic)
        .writeToBuffer(), // Assuming 'writeToBuffer' method exists on arg
  );

  final cmdRes = await _invokeCommand(app, cmdArg.writeToBuffer());
  final res = TInvokeCommandResponse.fromBuffer(cmdRes);
  if (!res.success) {
    throw Exception(res.errorMessage);
  }
  return fromBufferR(res.returns);
}
