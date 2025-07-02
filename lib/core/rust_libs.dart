import 'dart:js_interop';

extension type RustLibs._(JSObject _) implements JSObject {
  external void greet();
}

@JS()
external JSPromise<RustLibs> get _rustLibs;

Future<RustLibs> getRustLibs() {
  return JSPromiseToFuture(_rustLibs).toDart;
}
