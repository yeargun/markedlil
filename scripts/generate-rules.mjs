import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const caret = /(^|[^\[])\^/g;
function edit(regex, opt = "") {
  let source = typeof regex === "string" ? regex : regex.source;
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => new RegExp(source, opt),
  };
  return obj;
}

const supportsLookbehind = ((a = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + a);
  } catch {
    return false;
  }
})();

const other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] +\S/,
  listReplaceTask: /^\[[ xX]\] +/,
  listTaskCheckbox: /\[[ xX]\]/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
};

const newline = /^(?:[ \t]*(?:\n|$))+/;
const blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
const fences =
  /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
const hr =
  /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
const bullet = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
const lheadingCore =
  /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
const lheading = edit(lheadingCore)
  .replace(/bull/g, bullet)
  .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
  .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
  .replace(/blockquote/g, / {0,3}>/)
  .replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/)
  .replace(/html/g, / {0,3}<[^\n>]+>\n/)
  .replace(/\|table/g, "")
  .getRegex();
const lheadingGfm = edit(lheadingCore)
  .replace(/bull/g, bullet)
  .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
  .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
  .replace(/blockquote/g, / {0,3}>/)
  .replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/)
  .replace(/html/g, / {0,3}<[^\n>]+>\n/)
  .replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/)
  .getRegex();
const _paragraph =
  /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
const blockText = /^[^\n]+/;
const _blockLabel = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
const def = edit(
  /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/,
)
  .replace("label", _blockLabel)
  .replace(
    "title",
    /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/,
  )
  .getRegex();
const list = edit(/^(bull)([ \t][^\n]*?)?(?:\n|$)/)
  .replace(/bull/g, bullet)
  .getRegex();
const _tag =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
const html = edit(
  "^ {0,3}(?:" +
    "<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)" +
    "|comment[^\\n]*(\\n+|$)" +
    "|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)" +
    "|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)" +
    "|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)" +
    "|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" +
    "|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" +
    "|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" +
    ")",
  "i",
)
  .replace("comment", _comment)
  .replace("tag", _tag)
  .replace(
    "attribute",
    / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/,
  )
  .getRegex();
const createParagraph = (listInterrupt) =>
  edit(_paragraph)
    .replace("hr", hr)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("|lheading", "")
    .replace("|table", "")
    .replace("blockquote", " {0,3}>")
    .replace(
      "fences",
      " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)",
    )
    .replace("list", listInterrupt)
    .replace(
      "html",
      "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)",
    )
    .replace("tag", _tag)
    .getRegex();
const paragraph = createParagraph(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
const blockquoteParagraph = createParagraph(
  / {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/,
);
const blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
  .replace("paragraph", blockquoteParagraph)
  .getRegex();
const gfmTable = edit(
  "^ *([^\\n ].*)\\n" +
    " {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)" +
    "(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",
)
  .replace("hr", hr)
  .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
  .replace("blockquote", " {0,3}>")
  .replace("code", "(?: {4}| {0,3}\t)[^\\n]")
  .replace(
    "fences",
    " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)",
  )
  .replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]")
  .replace(
    "html",
    "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)",
  )
  .replace("tag", _tag)
  .getRegex();
const paragraphGfm = edit(_paragraph)
  .replace("hr", hr)
  .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
  .replace("|lheading", "")
  .replace("table", gfmTable)
  .replace("blockquote", " {0,3}>")
  .replace(
    "fences",
    " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)",
  )
  .replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]")
  .replace(
    "html",
    "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)",
  )
  .replace("tag", _tag)
  .getRegex();
const htmlPed = edit(
  "^ *(?:comment *(?:\\n|\\s*$)" +
    "|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)" +
    '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))',
)
  .replace("comment", _comment)
  .replace(
    /tag/g,
    "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b",
  )
  .getRegex();
const defPed =
  /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/;
const headingPed = /^(#{1,6})(.*)(?:\n+|$)/;
const lheadingPed = /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
const paragraphPed = edit(_paragraph)
  .replace("hr", hr)
  .replace("heading", " *#{1,6} *[^\n]")
  .replace("lheading", lheading)
  .replace("|table", "")
  .replace("blockquote", " {0,3}>")
  .replace("|fences", "")
  .replace("|list", "")
  .replace("|html", "")
  .replace("|tag", "")
  .getRegex();

const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
const br = /^( {2,}|\\)\n(?!\s*$)/;
const inlineText =
  /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
const _punctuation = /[\p{P}\p{S}]/u;
const _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
const _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
const punctuation = edit(/^((?![*_])punctSpace)/, "u")
  .replace(/punctSpace/g, _punctuationOrSpace)
  .getRegex();
const _openQuote = /[\p{Pi}\p{Ps}"']/u;
const _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
const _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
const _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;
const blockSkip = edit(/link|precode-code|html/, "g")
  .replace(
    "link",
    /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/,
  )
  .replace("precode-", supportsLookbehind ? "(?<!`)()" : "(^^|[^`])")
  .replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/)
  .replace("html", /<(?! )[^<>]*?>/)
  .getRegex();
const emStrongLDelimCore =
  /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
const emStrongLDelim = edit(emStrongLDelimCore, "u")
  .replace(/punct/g, _punctuation)
  .getRegex();
const emStrongLDelimGfm = edit(emStrongLDelimCore, "u")
  .replace(/punct/g, _punctuationGfmStrongEm)
  .getRegex();
const emStrongLDelimPedanticCore =
  /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
const emStrongLDelimPedantic = edit(emStrongLDelimPedanticCore, "u")
  .replace(/openQuote/g, _openQuote)
  .replace(/punct/g, _punctuation)
  .getRegex();
const emStrongRDelimAstCore =
  "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)" +
  "|[^*]+(?=[^*])" +
  "|(?!\\*)punct(\\*+)(?=[\\s]|$)" +
  "|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)" +
  "|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)" +
  "|[\\s](\\*+)(?!\\*)(?=punct)" +
  "|(?!\\*)punct(\\*+)(?!\\*)(?=punct)" +
  "|notPunctSpace(\\*+)(?=notPunctSpace)";
const emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
const emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm)
  .replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm)
  .replace(/punct/g, _punctuationGfmStrongEm)
  .getRegex();
const emStrongRDelimAstPedanticCore =
  "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)" +
  "|[^*]+(?=[^*])" +
  "|(?!\\*)punct(\\*+)(?=[\\s]|$)" +
  "|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)" +
  "|(?!\\*)[\\s](\\*+)(?=notPunctSpace)" +
  "|[\\s](\\*+)(?!\\*)(?=punct)" +
  "|(?!\\*)punct(\\*+)(?!\\*)(?=punct)" +
  "|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
const emStrongRDelimAstPedantic = edit(emStrongRDelimAstPedanticCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
const emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)" +
    "|[^_]+(?=[^_])" +
    "|(?!_)punct(_+)(?=[\\s]|$)" +
    "|notPunctSpace(_+)(?!_)(?=punctSpace|$)" +
    "|(?!_)punctSpace(_+)(?=notPunctSpace)" +
    "|[\\s](_+)(?!_)(?=punct)" +
    "|(?!_)punct(_+)(?!_)(?=punct)",
  "gu",
)
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
const emStrongRDelimUndPedanticCore =
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)" +
  "|[^_]+(?=[^_])" +
  "|(?!_)punct(_+)(?=[\\s]|$)" +
  "|notPunctSpace(_+)(?!_)(?=punctSpace|$)" +
  "|(?!_)[\\s](_+)(?=notPunctSpace)" +
  "|[\\s](_+)(?!_)(?=punct)" +
  "|(?!_)punct(_+)(?!_)(?=punct)" +
  "|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
const emStrongRDelimUndPedantic = edit(emStrongRDelimUndPedanticCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
const delLDelim = edit(/^~~?(?:((?!~)punct)|[^\s~])/, "u")
  .replace(/punct/g, _punctuation)
  .getRegex();
const delRDelimCore =
  "^[^~]+(?=[^~])" +
  "|(?!~)punct(~~?)(?=[\\s]|$)" +
  "|notPunctSpace(~~?)(?!~)(?=punctSpace|$)" +
  "|(?!~)punctSpace(~~?)(?=notPunctSpace)" +
  "|[\\s](~~?)(?!~)(?=punct)" +
  "|(?!~)punct(~~?)(?!~)(?=punct)" +
  "|notPunctSpace(~~?)(?=notPunctSpace)";
const delRDelim = edit(delRDelimCore, "gu")
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();
const anyPunctuation = edit(/\\(punct)/, "gu")
  .replace(/punct/g, _punctuation)
  .getRegex();
const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
  .replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
  .replace(
    "email",
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
  )
  .getRegex();
const _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
const tag = edit(
  "^comment" +
    "|^</[a-zA-Z][\\w:-]*\\s*>" +
    "|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>" +
    "|^<\\?[\\s\\S]*?\\?>" +
    "|^<![a-zA-Z]+\\s[\\s\\S]*?>" +
    "|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
)
  .replace("comment", _inlineComment)
  .replace(
    "attribute",
    /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,
  )
  .getRegex();
const _inlineLabel =
  /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/;
const link = edit(
  /^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/,
)
  .replace("label", _inlineLabel)
  .replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/)
  .replace(
    "title",
    /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/,
  )
  .getRegex();
const reflink = edit(/^!?\[(label)\]\[(ref)\]/)
  .replace("label", _inlineLabel)
  .replace("ref", _blockLabel)
  .getRegex();
const nolink = edit(/^!?\[(ref)\](?:\[\])?/)
  .replace("ref", _blockLabel)
  .getRegex();
const reflinkSearch = edit("reflink|nolink(?!\\()", "g")
  .replace("reflink", reflink)
  .replace("nolink", nolink)
  .getRegex();
const _caseInsensitiveProtocol = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
const url = edit(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/)
  .replace("protocol", _caseInsensitiveProtocol)
  .replace(
    "email",
    /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  )
  .getRegex();
const backpedal =
  /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/;
const del =
  /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/;
const textGfm = edit(
  /^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
)
  .replace("protocol", _caseInsensitiveProtocol)
  .getRegex();
const brBreaks = edit(br).replace("{2,}", "*").getRegex();
const textBreaks = edit(textGfm)
  .replace("\\b_", "\\b_| {2,}\\n")
  .replace(/\{2,\}/g, "*")
  .getRegex();
const _inlineLabel2 = _inlineLabel;
const linkPed = edit(/^!?\[(label)\]\((.*?)\)/)
  .replace("label", _inlineLabel2)
  .getRegex();
const reflinkPed = edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
  .replace("label", _inlineLabel2)
  .getRegex();

function lilString(s) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function emit(name, re) {
  const flags = re.flags;
  if (flags.length === 0) {
    return `export Regex ${name} = new Regex(${lilString(re.source)});`;
  }
  return `export Regex ${name} = new Regex(${lilString(re.source)}, ${lilString(flags)});`;
}

const named = [
  ["newline", newline],
  ["blockCode", blockCode],
  ["fences", fences],
  ["hr", hr],
  ["heading", heading],
  ["lheading", lheading],
  ["lheadingGfm", lheadingGfm],
  ["def", def],
  ["list", list],
  ["html", html],
  ["paragraph", paragraph],
  ["blockquote", blockquote],
  ["gfmTable", gfmTable],
  ["paragraphGfm", paragraphGfm],
  ["blockText", blockText],
  ["htmlPed", htmlPed],
  ["defPed", defPed],
  ["headingPed", headingPed],
  ["lheadingPed", lheadingPed],
  ["paragraphPed", paragraphPed],
  ["escapeRe", escape],
  ["inlineCode", inlineCode],
  ["br", br],
  ["inlineText", inlineText],
  ["punctuation", punctuation],
  ["blockSkip", blockSkip],
  ["emStrongLDelim", emStrongLDelim],
  ["emStrongLDelimGfm", emStrongLDelimGfm],
  ["emStrongLDelimPedantic", emStrongLDelimPedantic],
  ["emStrongRDelimAst", emStrongRDelimAst],
  ["emStrongRDelimAstGfm", emStrongRDelimAstGfm],
  ["emStrongRDelimAstPedantic", emStrongRDelimAstPedantic],
  ["emStrongRDelimUnd", emStrongRDelimUnd],
  ["emStrongRDelimUndPedantic", emStrongRDelimUndPedantic],
  ["delLDelim", delLDelim],
  ["delRDelim", delRDelim],
  ["anyPunctuation", anyPunctuation],
  ["autolink", autolink],
  ["tag", tag],
  ["link", link],
  ["reflink", reflink],
  ["nolink", nolink],
  ["reflinkSearch", reflinkSearch],
  ["urlRe", url],
  ["backpedal", backpedal],
  ["delRe", del],
  ["textGfm", textGfm],
  ["brBreaks", brBreaks],
  ["textBreaks", textBreaks],
  ["linkPed", linkPed],
  ["reflinkPed", reflinkPed],
];

const otherLines = Object.entries(other).map(([key, re]) =>
  emit(`other${key[0].toUpperCase()}${key.slice(1)}`, re),
);

const indentFns = [
  [
    "nextBullet",
    (i) =>
      `^ {0,${i}}(?:[*+-]|\\d{1,9}[.)])((?:[ \\t][^\\n]*)?(?:\\n|$))`,
    "",
  ],
  [
    "hrIndent",
    (i) =>
      `^ {0,${i}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`,
    "",
  ],
  ["fencesBegin", (i) => `^ {0,${i}}(?:\`\`\`|~~~)`, ""],
  ["headingBegin", (i) => `^ {0,${i}}#`, ""],
  ["htmlBegin", (i) => `^ {0,${i}}<(?:[a-z].*>|!--)`, "i"],
  ["blockquoteBegin", (i) => `^ {0,${i}}>`, ""],
];

const indentLines = [];
for (const [name, make, flags] of indentFns) {
  for (let i = 0; i <= 3; i += 1) {
    indentLines.push(
      emit(`${name}${i}`, flags ? new RegExp(make(i), flags) : new RegExp(make(i))),
    );
  }
}

const body = [
  "// Generated from marked 18.0.10 rules. Do not edit by hand.",
  `// lookbehind=${supportsLookbehind}`,
  ...named.map(([name, re]) => emit(name, re)),
  ...otherLines,
  ...indentLines,
  "",
  "export Regex nextBulletRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return nextBullet0; }",
  "  if (i == 1) { return nextBullet1; }",
  "  if (i == 2) { return nextBullet2; }",
  "  return nextBullet3;",
  "}",
  "",
  "export Regex hrIndentRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return hrIndent0; }",
  "  if (i == 1) { return hrIndent1; }",
  "  if (i == 2) { return hrIndent2; }",
  "  return hrIndent3;",
  "}",
  "",
  "export Regex fencesBeginRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return fencesBegin0; }",
  "  if (i == 1) { return fencesBegin1; }",
  "  if (i == 2) { return fencesBegin2; }",
  "  return fencesBegin3;",
  "}",
  "",
  "export Regex headingBeginRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return headingBegin0; }",
  "  if (i == 1) { return headingBegin1; }",
  "  if (i == 2) { return headingBegin2; }",
  "  return headingBegin3;",
  "}",
  "",
  "export Regex htmlBeginRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return htmlBegin0; }",
  "  if (i == 1) { return htmlBegin1; }",
  "  if (i == 2) { return htmlBegin2; }",
  "  return htmlBegin3;",
  "}",
  "",
  "export Regex blockquoteBeginRegex(int indent) {",
  "  int i = indent - 1;",
  "  if (i < 0) { i = 0; }",
  "  if (i > 3) { i = 3; }",
  "  if (i == 0) { return blockquoteBegin0; }",
  "  if (i == 1) { return blockquoteBegin1; }",
  "  if (i == 2) { return blockquoteBegin2; }",
  "  return blockquoteBegin3;",
  "}",
  "",
  'export Regex listItemRegex(string bull) {',
  '  return new Regex("^( {0,3}" + bull + ")((?:[\\\\t ][^\\\\n]*)?(?:\\\\n|$))");',
  "}",
  "",
].join("\n");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(resolve(root, "src/rules.lil"), `${body}\n`);
console.log("wrote src/rules.lil");
