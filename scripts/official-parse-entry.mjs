import { _Lexer } from "../official/marked-18.0.10/src/Lexer.ts"
import { _Parser } from "../official/marked-18.0.10/src/Parser.ts"
import { _getDefaults } from "../official/marked-18.0.10/src/defaults.ts"

let current = _getDefaults()

export function parse(src, opt) {
  if (typeof src !== "string") {
    throw new TypeError("marked(): input must be a string")
  }
  const options = { ...current, ...(opt ?? {}) }
  return _Parser.parse(_Lexer.lex(src, options), options)
}

export function parseInline(src, opt) {
  if (typeof src !== "string") {
    throw new TypeError("marked(): input must be a string")
  }
  const options = { ...current, ...(opt ?? {}) }
  return _Parser.parseInline(_Lexer.lexInline(src, options), options)
}

export function setOptions(opt) {
  current = { ...current, ...opt }
  return current
}

export function getDefaults() {
  return _getDefaults()
}

export function options() {
  return current
}

function marked(src, opt) {
  return parse(src, opt)
}
marked.parse = marked
marked.parseInline = parseInline
marked.setOptions = function setMarkedOptions(opt) {
  setOptions(opt)
  marked.defaults = current
  return marked
}
marked.options = marked.setOptions
marked.getDefaults = getDefaults
marked.defaults = current

export { marked }
export default marked
