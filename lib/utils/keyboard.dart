import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

bool isSecondaryDown(KeyEvent event) {
  if (Platform.isMacOS) {
    return HardwareKeyboard.instance.isMetaPressed;
  }
  return HardwareKeyboard.instance.isControlPressed;
}
