enum JsonTokenizerState {
  normal,
  inString,
  escaped,
}

enum ValidJsonState {
  start,
  inObject,
  inArray,
  expectKey,
  inKey,
  expectColon,
  expectValue,
  inString,
  inNumber,
  inTrue,
  inFalse,
  inNull,
  expectCommaOrEnd,
  end,
  error,
}

const isWhitespace = (c: string): boolean =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r'

const isNumberStart = (c: string): boolean =>
  c === '-' || (c >= '0' && c <= '9')

const isNumberChar = (c: string): boolean =>
  (c >= '0' && c <= '9') || c === '.' || c === 'e' || c === 'E' || c === '+' || c === '-'

export function isValidJson(jsonString: string): boolean {
  if (jsonString.length === 0) return false

  const stateStack: ValidJsonState[] = [ValidJsonState.start]
  const bracketStack: string[] = []
  let literalIndex = 0
  let i = 0

  while (i < jsonString.length && stateStack[stateStack.length - 1] !== ValidJsonState.error) {
    const currentState = stateStack[stateStack.length - 1]
    const char = jsonString[i]

    const closeBrace = () => {
      if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '{') {
        bracketStack.pop()
        stateStack[stateStack.length - 1] =
          bracketStack.length === 0
            ? ValidJsonState.end
            : ValidJsonState.expectCommaOrEnd
      } else {
        stateStack[stateStack.length - 1] = ValidJsonState.error
      }
    }
    const closeBracket = () => {
      if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '[') {
        bracketStack.pop()
        stateStack[stateStack.length - 1] =
          bracketStack.length === 0
            ? ValidJsonState.end
            : ValidJsonState.expectCommaOrEnd
      } else {
        stateStack[stateStack.length - 1] = ValidJsonState.error
      }
    }

    switch (currentState) {
      case ValidJsonState.start:
        if (char === '{') {
          stateStack[stateStack.length - 1] = ValidJsonState.inObject
          bracketStack.push('{')
        } else if (char === '[') {
          stateStack[stateStack.length - 1] = ValidJsonState.inArray
          bracketStack.push('[')
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.inObject:
        if (char === '"') {
          stateStack[stateStack.length - 1] = ValidJsonState.inKey
        } else if (char === '}') {
          closeBrace()
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.inArray:
        if (char === '{') {
          bracketStack.push('{')
          stateStack.push(ValidJsonState.inObject)
        } else if (char === '[') {
          bracketStack.push('[')
          stateStack.push(ValidJsonState.inArray)
        } else if (char === '"') {
          stateStack.push(ValidJsonState.inString)
        } else if (isNumberStart(char)) {
          stateStack.push(ValidJsonState.inNumber)
        } else if (char === 't') {
          stateStack.push(ValidJsonState.inTrue)
          literalIndex = 1
        } else if (char === 'f') {
          stateStack.push(ValidJsonState.inFalse)
          literalIndex = 1
        } else if (char === 'n') {
          stateStack.push(ValidJsonState.inNull)
          literalIndex = 1
        } else if (char === ']') {
          closeBracket()
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.expectKey:
        if (char === '"') {
          stateStack[stateStack.length - 1] = ValidJsonState.inKey
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.inKey:
        if (char === '"' && jsonString[i - 1] !== '\\') {
          stateStack[stateStack.length - 1] = ValidJsonState.expectColon
        }
        break
      case ValidJsonState.expectColon:
        if (char === ':') {
          stateStack[stateStack.length - 1] = ValidJsonState.expectValue
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.expectValue:
        if (char === '{') {
          bracketStack.push('{')
          stateStack[stateStack.length - 1] = ValidJsonState.inObject
        } else if (char === '[') {
          bracketStack.push('[')
          stateStack[stateStack.length - 1] = ValidJsonState.inArray
        } else if (char === '"') {
          stateStack[stateStack.length - 1] = ValidJsonState.inString
        } else if (isNumberStart(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.inNumber
        } else if (char === 't') {
          stateStack[stateStack.length - 1] = ValidJsonState.inTrue
          literalIndex = 1
        } else if (char === 'f') {
          stateStack[stateStack.length - 1] = ValidJsonState.inFalse
          literalIndex = 1
        } else if (char === 'n') {
          stateStack[stateStack.length - 1] = ValidJsonState.inNull
          literalIndex = 1
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.inString:
        if (char === '"' && jsonString[i - 1] !== '\\') {
          let backslashCount = 0
          let j = i - 1
          while (j >= 0 && jsonString[j] === '\\') {
            backslashCount++
            j--
          }
          if (backslashCount % 2 === 0) {
            stateStack[stateStack.length - 1] = ValidJsonState.expectCommaOrEnd
          }
        }
        break
      case ValidJsonState.inNumber:
        if (char === ',' || char === '}' || char === ']' || isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.expectCommaOrEnd
          i--
        } else if (!isNumberChar(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.inTrue: {
        const s = 'true'
        if (literalIndex < s.length && char === s[literalIndex]) {
          literalIndex++
          if (literalIndex === s.length) {
            stateStack[stateStack.length - 1] = ValidJsonState.expectCommaOrEnd
          }
        } else {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      }
      case ValidJsonState.inFalse: {
        const s = 'false'
        if (literalIndex < s.length && char === s[literalIndex]) {
          literalIndex++
          if (literalIndex === s.length) {
            stateStack[stateStack.length - 1] = ValidJsonState.expectCommaOrEnd
          }
        } else {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      }
      case ValidJsonState.inNull: {
        const s = 'null'
        if (literalIndex < s.length && char === s[literalIndex]) {
          literalIndex++
          if (literalIndex === s.length) {
            stateStack[stateStack.length - 1] = ValidJsonState.expectCommaOrEnd
          }
        } else {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      }
      case ValidJsonState.expectCommaOrEnd:
        if (char === ',') {
          if (bracketStack.length > 0) {
            if (bracketStack[bracketStack.length - 1] === '{') {
              stateStack[stateStack.length - 1] = ValidJsonState.expectKey
            } else {
              stateStack[stateStack.length - 1] = ValidJsonState.inArray
            }
          } else {
            stateStack[stateStack.length - 1] = ValidJsonState.error
          }
        } else if (char === '}') {
          closeBrace()
        } else if (char === ']') {
          closeBracket()
        } else if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.end:
        if (!isWhitespace(char)) {
          stateStack[stateStack.length - 1] = ValidJsonState.error
        }
        break
      case ValidJsonState.error:
        return false
    }
    i++
  }

  return (
    stateStack[stateStack.length - 1] === ValidJsonState.end &&
    bracketStack.length === 0
  )
}

export function formatJson(text: string): string {
  let buffer = ''
  let indentLevel = 0
  let state = JsonTokenizerState.normal

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    switch (state) {
      case JsonTokenizerState.normal:
        if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
          break
        }
        if (char === '{' || char === '[') {
          buffer += char
          indentLevel++
          if (
            i + 1 < text.length &&
            (text[i + 1] === '}' || text[i + 1] === ']')
          ) {
            // empty object/array
          } else {
            buffer += '\n' + '  '.repeat(indentLevel)
          }
        } else if (char === '}' || char === ']') {
          indentLevel--
          if (i > 0 && text[i - 1] !== '{' && text[i - 1] !== '[') {
            buffer += '\n' + '  '.repeat(indentLevel)
          }
          buffer += char
        } else if (char === ',') {
          buffer += char + '\n' + '  '.repeat(indentLevel)
        } else if (char === ':') {
          buffer += char + ' '
        } else if (char === '"') {
          buffer += char
          state = JsonTokenizerState.inString
        } else {
          buffer += char
        }
        break
      case JsonTokenizerState.inString:
        buffer += char
        if (char === '\\') {
          state = JsonTokenizerState.escaped
        } else if (char === '"') {
          state = JsonTokenizerState.normal
        }
        break
      case JsonTokenizerState.escaped:
        buffer += char
        state = JsonTokenizerState.inString
        break
    }
  }

  return buffer
}

export function tryFormatJson(text: string): string | null {
  if (!isValidJson(text)) return null
  try {
    return formatJson(text)
  } catch {
    return null
  }
}
