/// States for the JSON tokenizer state machine
enum _JsonTokenizerState {
  normal, // Processing outside of string literals
  inString, // Inside a string literal
  escaped, // After an escape character within a string
}

bool maybeJson(String text) {
  // Simple validation: braces must match
  int braceCount = 0;
  bool inString = false;
  bool escaped = false;

  for (int i = 0; i < text.length; i++) {
    final char = text[i];

    if (!inString) {
      if (char == '"') {
        inString = true;
      } else if (char == '{') {
        braceCount++;
      } else if (char == '}') {
        braceCount--;
        if (braceCount < 0) {
          throw FormatException('Invalid JSON: unbalanced braces');
        }
      } else if (char == '[') {
        braceCount++;
      } else if (char == ']') {
        braceCount--;
        if (braceCount < 0) {
          throw FormatException('Invalid JSON: unbalanced braces');
        }
      }
    } else {
      if (escaped) {
        escaped = false;
      } else if (char == '\\') {
        escaped = true;
      } else if (char == '"') {
        inString = false;
      }
    }
  }

  return braceCount == 0;
}

/// Format a JSON string with proper indentation and line breaks
String formatJson(String text) {
  final buffer = StringBuffer();
  int indentLevel = 0;
  var state = _JsonTokenizerState.normal;

  for (int i = 0; i < text.length; i++) {
    final char = text[i];

    // State machine processor
    switch (state) {
      case _JsonTokenizerState.normal:
        // Skip existing whitespace characters
        if (char == ' ' || char == '\n' || char == '\r' || char == '\t') {
          continue;
        }

        if (char == '{' || char == '[') {
          buffer.write(char);
          indentLevel++;
          // Check for empty objects/arrays
          if (i + 1 < text.length &&
              (text[i + 1] == '}' || text[i + 1] == ']')) {
            // Don't add newline or indent for empty objects/arrays
          } else {
            buffer.write('\n');
            buffer.write('  ' * indentLevel);
          }
        } else if (char == '}' || char == ']') {
          indentLevel--;
          // Add newline and indent before closing bracket unless it's an empty object/array
          if (i > 0 && text[i - 1] != '{' && text[i - 1] != '[') {
            buffer.write('\n');
            buffer.write('  ' * indentLevel);
          }
          buffer.write(char);
        } else if (char == ',') {
          buffer.write(char);
          buffer.write('\n');
          buffer.write('  ' * indentLevel);
        } else if (char == ':') {
          buffer.write(char);
          buffer.write(' '); // Add space after colon
        } else if (char == '"') {
          buffer.write(char);
          state = _JsonTokenizerState.inString;
        } else {
          buffer.write(char);
        }
        break;

      case _JsonTokenizerState.inString:
        buffer.write(char);
        if (char == '\\') {
          // After backslash, switch to escaped state
          state = _JsonTokenizerState.escaped;
        } else if (char == '"') {
          // End of string
          state = _JsonTokenizerState.normal;
        }
        break;

      case _JsonTokenizerState.escaped:
        // Handle escaped character
        buffer.write(char);
        // Return to string state after handling the escaped character
        state = _JsonTokenizerState.inString;
        break;
    }
  }

  return buffer.toString();
}
