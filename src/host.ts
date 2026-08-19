export function regexSetLastIndex(re: RegExp, value: number): void {
  re.lastIndex = value;
}

export function encodeURIValue(s: string): string {
  return encodeURI(s);
}

export function stringTrim(s: string): string {
  return s.trim();
}

export function stringTrimEnd(s: string): string {
  return s.trimEnd();
}

export function stringTrimStart(s: string): string {
  return s.trimStart();
}

export function stringSearch(s: string, re: RegExp): number {
  return s.search(re);
}

export function codePointCount(s: string): number {
  return [...s].length;
}

export function firstCodePointSize(s: string): number {
  const first = [...s][0];
  return first == null ? 0 : first.length;
}

export function intMinusOne(n: number): number {
  return (n | 0) - 1;
}

export function readHref(link: { href: string }): string {
  return link.href;
}

export function readTitle(link: { title: string }): string {
  return link.title;
}

export function runRegexExec(re: RegExp, src: string): RegExpExecArray | null {
  return re.exec(src);
}

export function backpedalUrl(re: RegExp, src: string): string {
  let prev = "";
  let current = src;
  do {
    prev = current;
    re.lastIndex = 0;
    current = re.exec(current)?.[0] ?? "";
  } while (prev !== current);
  return current;
}

export function parseBulletStart(bull: string): number {
  let n = 0;
  for (let i = 0; i < bull.length; i++) {
    const c = bull.charCodeAt(i);
    if (c < 48 || c > 57) break;
    n = n * 10 + (c - 48);
  }
  return n;
}

export function pickRegex(flag: boolean, whenTrue: RegExp, whenFalse: RegExp): RegExp {
  return flag ? whenTrue : whenFalse;
}

export function pickRegex3(
  a: boolean,
  ra: RegExp,
  b: boolean,
  rb: RegExp,
  rc: RegExp,
): RegExp {
  if (a) return ra;
  if (b) return rb;
  return rc;
}

export function queueJob(lx: { inlineQueue: { src: string; tokens: unknown[] }[] }, src: string, tokens: unknown[]): unknown[] {
  lx.inlineQueue.push({ src, tokens });
  return tokens;
}

export function wrapP(inner: string): string {
  return "<p>" + inner + "</p>\n";
}

export function wrapHeading(depth: string, inner: string): string {
  return "<h" + depth + ">" + inner + "</h" + depth + ">\n";
}

export function appendRaw(token: { raw: string }, extra: string): void {
  token.raw = token.raw.endsWith("\n") ? token.raw + extra : token.raw + "\n" + extra;
}

export function setLastInlineSrc(lx: { inlineQueue: { src: string }[] }, src: string): void {
  if (lx.inlineQueue.length === 0) return;
  lx.inlineQueue[lx.inlineQueue.length - 1].src = src;
}

export function unshiftToken(tokens: unknown[], token: unknown): void {
  tokens.unshift(token);
}

const slots: Record<string, Function> = {};

export function setInline(fn: Function): void {
  slots.inline = fn;
}

export function setBlock(fn: Function): void {
  slots.block = fn;
}

export function setRenderInline(fn: Function): void {
  slots.renderInline = fn;
}

export function setRenderTokens(fn: Function): void {
  slots.renderTokens = fn;
}

export function callInline(lx: unknown, src: string, tokens: unknown[]): unknown[] {
  return slots.inline(lx, src, tokens);
}

export function callBlock(
  lx: unknown,
  src: string,
  tokens: unknown[],
  lastParagraphClipped: boolean,
): unknown[] {
  return slots.block(lx, src, tokens, lastParagraphClipped);
}

export function callRenderInline(tokens: unknown[], textOnly: boolean): string {
  return slots.renderInline(tokens, textOnly);
}

export function callRenderTokens(tokens: unknown[]): string {
  return slots.renderTokens(tokens);
}
