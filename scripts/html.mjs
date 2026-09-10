import { parse, parseFragment, serialize, serializeOuter } from 'parse5';

export { parse, parseFragment, serialize, serializeOuter };
export const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
export function setAttr(node, name, value) {
  node.attrs ||= [];
  const old = node.attrs.find(a => a.name === name);
  if (value === null) node.attrs = node.attrs.filter(a => a.name !== name);
  else if (old) old.value = String(value);
  else node.attrs.push({ name, value: String(value) });
}
export function* walk(node) {
  yield node;
  for (const child of node.childNodes || []) yield* walk(child);
}
export const find = (node, predicate) => [...walk(node)].find(predicate);
export const all = (node, predicate) => [...walk(node)].filter(predicate);
export const hasClass = (node, value) => (attr(node, 'class') || '').split(/\s+/).includes(value);
export const textContent = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textContent).join('');
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function replaceNode(node, nodes) {
  const parent = node.parentNode;
  parent.childNodes.splice(parent.childNodes.indexOf(node), 1, ...nodes);
  for (const next of nodes) next.parentNode = parent;
}
export const remove = node => replaceNode(node, []);
export function append(node, html) {
  const children = parseFragment(html).childNodes;
  for (const child of children) child.parentNode = node;
  node.childNodes.push(...children);
}
