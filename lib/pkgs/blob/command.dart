import 'dart:typed_data';

import 'package:handy_online_tools/core/rust_libs.dart';
import 'package:handy_online_tools/generated/proto/core.pb.dart';

String _pkgId = "hol.blob";

Future<Uint8List> loadBlob(NativeApp app, ICLoadBlobArg arg) async {
  final res = await invokeCommand(
    app,
    _pkgId,
    "open_zip",
    arg,
    ICLoadBlobRet.fromBuffer,
  );
  return Uint8List.fromList(res.data);
}
