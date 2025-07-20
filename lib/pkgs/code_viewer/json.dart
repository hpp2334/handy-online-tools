/// States for the JSON tokenizer state machine
enum _JsonTokenizerState {
  normal, // Processing outside of string literals
  inString, // Inside a string literal
  escaped, // After an escape character within a string
}

/// Enum representing all possible states in the JSON parsing state machine
enum _ValidJsonState {
  start,         // Initial state
  inObject,      // Inside an object
  inArray,       // Inside an array
  expectKey,     // Expecting a key in an object
  inKey,         // Inside a key string
  expectColon,   // Expecting a colon after a key
  expectValue,   // Expecting a value after a colon
  inString,      // Inside a string value
  inNumber,      // Inside a numeric value
  inTrue,        // Parsing 'true' literal
  inFalse,       // Parsing 'false' literal
  inNull,        // Parsing 'null' literal
  expectCommaOrEnd, // Expecting a comma or closing bracket
  end,           // Successfully reached end of valid JSON
  error          // Error state (invalid JSON)
}

/// Validates if a string is a valid JSON using a state machine approach
bool isValidJson(String jsonString) {
  if (jsonString.isEmpty) {
    return false;
  }
  
  // Stack to track nested structures and their states
  List<_ValidJsonState> stateStack = [_ValidJsonState.start];
  
  // Stack to track bracket types for matching purposes
  List<int> bracketStack = [];
  
  // Index for tracking special token processing
  int literalIndex = 0;
  
  // Process each character in the input string
  int i = 0;
  while (i < jsonString.length && stateStack.last != _ValidJsonState.error) {
    _ValidJsonState currentState = stateStack.last;
    final char = jsonString[i];
    
    switch (currentState) {
      // Initial state - expecting an object or array to start
      case _ValidJsonState.start:
        if (char == '{') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inObject;
          bracketStack.add('{'.codeUnitAt(0));
        } else if (char == '[') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inArray;
          bracketStack.add('['.codeUnitAt(0));
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Inside an object - expecting a key or end of object
      case _ValidJsonState.inObject:
        if (char == '"') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inKey;
        } else if (char == '}') {
          if (bracketStack.isNotEmpty && bracketStack.last == '{'.codeUnitAt(0)) {
            bracketStack.removeLast();
            if (bracketStack.isEmpty) {
              stateStack[stateStack.length - 1] = _ValidJsonState.end;
            } else {
              stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
            }
          } else {
            stateStack[stateStack.length - 1] = _ValidJsonState.error;
          }
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Inside an array - expecting a value or end of array
      case _ValidJsonState.inArray:
        if (char == '{') {
          bracketStack.add('{'.codeUnitAt(0));
          stateStack.add(_ValidJsonState.inObject);
        } else if (char == '[') {
          bracketStack.add('['.codeUnitAt(0));
          stateStack.add(_ValidJsonState.inArray);
        } else if (char == '"') {
          stateStack.add(_ValidJsonState.inString);
        } else if (_isNumberStart(char)) {
          stateStack.add(_ValidJsonState.inNumber);
        } else if (char == 't') {
          stateStack.add(_ValidJsonState.inTrue);
          literalIndex = 1; // Start after 't'
        } else if (char == 'f') {
          stateStack.add(_ValidJsonState.inFalse);
          literalIndex = 1; // Start after 'f'
        } else if (char == 'n') {
          stateStack.add(_ValidJsonState.inNull);
          literalIndex = 1; // Start after 'n'
        } else if (char == ']') {
          if (bracketStack.isNotEmpty && bracketStack.last == '['.codeUnitAt(0)) {
            bracketStack.removeLast();
            if (bracketStack.isEmpty) {
              stateStack[stateStack.length - 1] = _ValidJsonState.end;
            } else {
              stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
            }
          } else {
            stateStack[stateStack.length - 1] = _ValidJsonState.error;
          }
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Expecting a key in an object
      case _ValidJsonState.expectKey:
        if (char == '"') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inKey;
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Inside a key string
      case _ValidJsonState.inKey:
        if (char == '"' && jsonString[i - 1] != '\\') {
          stateStack[stateStack.length - 1] = _ValidJsonState.expectColon;
        }
        break;
        
      // Expecting a colon after a key
      case _ValidJsonState.expectColon:
        if (char == ':') {
          stateStack[stateStack.length - 1] = _ValidJsonState.expectValue;
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Expecting a value after a colon
      case _ValidJsonState.expectValue:
        if (char == '{') {
          bracketStack.add('{'.codeUnitAt(0));
          stateStack[stateStack.length - 1] = _ValidJsonState.inObject;
        } else if (char == '[') {
          bracketStack.add('['.codeUnitAt(0));
          stateStack[stateStack.length - 1] = _ValidJsonState.inArray;
        } else if (char == '"') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inString;
        } else if (_isNumberStart(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.inNumber;
        } else if (char == 't') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inTrue;
          literalIndex = 1; // Start after 't'
        } else if (char == 'f') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inFalse;
          literalIndex = 1; // Start after 'f'
        } else if (char == 'n') {
          stateStack[stateStack.length - 1] = _ValidJsonState.inNull;
          literalIndex = 1; // Start after 'n'
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Inside a string value
      case _ValidJsonState.inString:
        if (char == '"' && jsonString[i - 1] != '\\') {
          // Properly handle escape sequences to avoid early string termination
          bool escaped = false;
          int backslashCount = 0;
          int j = i - 1;
          while (j >= 0 && jsonString[j] == '\\') {
            backslashCount++;
            j--;
          }
          escaped = backslashCount % 2 == 1;
          
          if (!escaped) {
            stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
          }
        }
        break;
        
      // Inside a numeric value
      case _ValidJsonState.inNumber:
        if (char == ',' || char == '}' || char == ']' || _isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
          i--; // Backtrack one character to reprocess this delimiter
        } else if (!_isNumberChar(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Processing 'true' literal
      case _ValidJsonState.inTrue:
        final String trueStr = "true";
        if (literalIndex < trueStr.length && char == trueStr[literalIndex]) {
          literalIndex++;
          if (literalIndex == trueStr.length) {
            stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
          }
        } else {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Processing 'false' literal
      case _ValidJsonState.inFalse:
        final String falseStr = "false";
        if (literalIndex < falseStr.length && char == falseStr[literalIndex]) {
          literalIndex++;
          if (literalIndex == falseStr.length) {
            stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
          }
        } else {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Processing 'null' literal
      case _ValidJsonState.inNull:
        final String nullStr = "null";
        if (literalIndex < nullStr.length && char == nullStr[literalIndex]) {
          literalIndex++;
          if (literalIndex == nullStr.length) {
            stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
          }
        } else {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Expecting either a comma (for more items) or a closing bracket
      case _ValidJsonState.expectCommaOrEnd:
        if (char == ',') {
          if (bracketStack.isNotEmpty) {
            if (bracketStack.last == '{'.codeUnitAt(0)) {
              stateStack[stateStack.length - 1] = _ValidJsonState.expectKey;
            } else if (bracketStack.last == '['.codeUnitAt(0)) {
              stateStack[stateStack.length - 1] = _ValidJsonState.inArray;
            }
          } else {
            stateStack[stateStack.length - 1] = _ValidJsonState.error;
          }
        } else if (char == '}') {
          if (bracketStack.isNotEmpty && bracketStack.last == '{'.codeUnitAt(0)) {
            bracketStack.removeLast();
            if (bracketStack.isEmpty) {
              stateStack[stateStack.length - 1] = _ValidJsonState.end;
            } else {
              stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
            }
          } else {
            stateStack[stateStack.length - 1] = _ValidJsonState.error;
          }
        } else if (char == ']') {
          if (bracketStack.isNotEmpty && bracketStack.last == '['.codeUnitAt(0)) {
            bracketStack.removeLast();
            if (bracketStack.isEmpty) {
              stateStack[stateStack.length - 1] = _ValidJsonState.end;
            } else {
              stateStack[stateStack.length - 1] = _ValidJsonState.expectCommaOrEnd;
            }
          } else {
            stateStack[stateStack.length - 1] = _ValidJsonState.error;
          }
        } else if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Successfully reached the end of valid JSON - only whitespace allowed after
      case _ValidJsonState.end:
        if (!_isWhitespace(char)) {
          stateStack[stateStack.length - 1] = _ValidJsonState.error;
        }
        break;
        
      // Error state - invalid JSON detected
      case _ValidJsonState.error:
        return false;
    }
    
    i++;
  }
  
  // Check if we've successfully reached the end state and all brackets are matched
  return stateStack.last == _ValidJsonState.end && bracketStack.isEmpty;
}

/// Checks if a character is a whitespace
bool _isWhitespace(String char) {
  return char == ' ' || char == '\t' || char == '\n' || char == '\r';
}

/// Checks if a character can be the start of a number
bool _isNumberStart(String char) {
  return (char == '-' || (char.codeUnitAt(0) >= '0'.codeUnitAt(0) && char.codeUnitAt(0) <= '9'.codeUnitAt(0)));
}

/// Checks if a character can be part of a number
bool _isNumberChar(String char) {
  // Numbers can contain digits, decimal point, exponent marker, plus/minus signs
  return (char.codeUnitAt(0) >= '0'.codeUnitAt(0) && char.codeUnitAt(0) <= '9'.codeUnitAt(0)) || 
         char == '.' || char == 'e' || char == 'E' || char == '+' || char == '-';
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
