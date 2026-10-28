import domino from '@mixmark-io/domino';
import TurndownService from 'turndown';
import { stringify as yamlStringify } from 'yaml';

export const METADATA_HEADING = '文档信息';
export const BODY_HEADING = '正文';
export const END_HEADING = '迁移信息';
export const SLOT_PATTERN = /【网站组件：([A-Za-z]+)】/g;
export const SLOT_NAMES = new Set(['AskBox', 'CreditPlanner', 'SelectionWorkbench', 'HomeStats', 'CourseExplorer']);
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const nodes = (root, selector) => Array.from(root.querySelectorAll(selector));
export const documentOf = (html) => domino.createDocument('<body>' + html + '</body>');
export const plain = (value) => documentOf(value || '').body.textContent.trim();

/** Keep emphasis as explicit inline HTML: Chinese punctuation is not always a Markdown delimiter. */
export function markdownConverter() {
  const converter = new TurndownService({ headingStyle:'atx', codeBlockStyle:'fenced', bulletListMarker:'-' });
  for (const tag of ['b', 'strong', 'em', 'i', 'u', 'del']) {
    const output = { strong:'b', i:'em' }[tag] || tag;
    converter.addRule('inline-' + tag, { filter:tag, replacement:(_, node) => `<${output}>${inlineXml(node)}</${output}>` });
  }
  converter.addRule('native-todo', { filter:'checkbox', replacement:(_, node) => '\n\n- [ ] ' + inlineXml(node) + '\n\n' });
  converter.addRule('native-formula', { filter:'latex', replacement:(_, node) => '`' + node.textContent.replace(/`/g, '') + '`' });
  converter.addRule('table', { filter:'table', replacement:(_, table) => {
    if (nodes(table, '[colspan],[rowspan]').some((e) => Number(e.getAttribute('colspan') || 1) > 1 || Number(e.getAttribute('rowspan') || 1) > 1)) return '\n\n' + cleanHtml(table) + '\n\n';
    const rows = nodes(table, 'tr').map((row) => Array.from(row.children).filter((cell) => ['TH','TD'].includes(cell.tagName)).map((cell) => converter.turndown(cell.innerHTML).trim().replace(/\|/g, '\\|').replace(/\n+/g, '<br/>')));
    if (!rows.length) return '';
    const width = Math.max(...rows.map((r) => r.length));
    const line = (row) => '| ' + Array.from({length:width}, (_, i) => row[i] || '').join(' | ') + ' |';
    return '\n\n' + [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n') + '\n\n';
  }});
  converter.addRule('aside', { filter:(n) => n.tagName === 'ASIDE' || n.tagName === 'CALLOUT', replacement:(content) => '\n\n' + content.trim().split('\n').map((line) => '> ' + line).join('\n') + '\n\n' });
  return converter;
}

function inlineXml(parent) {
  return Array.from(parent.childNodes).map((node) => {
    if (node.nodeType === 3) return escapeHtml(node.nodeValue);
    const tag = node.tagName?.toLowerCase();
    if (tag === 'br') return '<br/>';
    if (tag === 'a') return `<a href="${escapeHtml(node.getAttribute('href') || '')}">${inlineXml(node)}</a>`;
    if (tag === 'code') return '<code>' + escapeHtml(node.textContent) + '</code>';
    if (['b','strong','em','i','u','del'].includes(tag)) return `<${tag === 'strong' ? 'b' : tag === 'i' ? 'em' : tag}>${inlineXml(node)}</${tag === 'strong' ? 'b' : tag === 'i' ? 'em' : tag}>`;
    return inlineXml(node);
  }).join('');
}

export function cleanHtml(node) {
  const clone = node.cloneNode(true);
  for (const item of [clone, ...nodes(clone, '*')]) {
    for (const attr of Array.from(item.attributes || [])) if (!['href','src','alt','colspan','rowspan'].includes(attr.name)) item.removeAttribute(attr.name);
  }
  return clone.outerHTML;
}

export function partsFromXml(xml) {
  const dom = documentOf(xml);
  const children = Array.from(dom.body.children);
  const begin = children.findIndex((e) => /^H[1-6]$/.test(e.tagName) && e.textContent.trim() === BODY_HEADING);
  const end = children.findIndex((e, i) => i > begin && /^H[1-6]$/.test(e.tagName) && e.textContent.trim() === END_HEADING);
  if (begin < 0 || end <= begin) throw new Error('缺少“正文”或“迁移信息”分界标题；保留上一版');
  const metadata = {};
  for (const table of children.slice(0, begin).filter((e) => e.tagName === 'TABLE')) {
    for (const row of nodes(table, 'tr')) {
      const cells = Array.from(row.children).filter((e) => ['TH','TD'].includes(e.tagName));
      if (cells.length === 2) metadata[cells[0].textContent.trim()] = cells[1].textContent.trim();
    }
  }
  const body = documentOf(children.slice(begin + 1, end).map((e) => e.outerHTML).join(''));
  const title = dom.querySelector('title')?.textContent.trim();
  if (!title) throw new Error('飞书文档没有标题');
  return { dom, body, metadata, title, beginNode:children[begin], endNode:children[end] };
}

export function metadataValues(frontmatter) {
  return {
    '作者':(frontmatter.authors || []).join('、'),
    '适用阶段':(frontmatter.stage || ['全阶段']).join('、'),
    '标签':(frontmatter.tags || []).join('、'),
    '内容状态':({draft:'待核对',stable:'已定稿',outdated:'已过期'})[frontmatter.status || 'stable'],
    '最近人工核对':frontmatter.reviewedAt ? new Date(frontmatter.reviewedAt).toISOString().slice(0,10) : '未标注',
    '页面摘要':frontmatter.description || '',
    '卡片摘要':frontmatter.summary || frontmatter.description || '',
    '导航名称':frontmatter.sidebar?.label || '',
    '导航顺序':String(frontmatter.sidebar?.order ?? ''),
    '页首提示':plain(frontmatter.banner?.content || ''),
    ...(frontmatter.hero ? {'首页副标题':frontmatter.hero.tagline || ''} : {}),
  };
}

export function metadataXml(frontmatter) {
  return '<h2>文档信息</h2><table><tbody><tr><td><p><b>项目</b></p></td><td><p><b>内容（可编辑）</b></p></td></tr>' + Object.entries(metadataValues(frontmatter)).map(([key, value]) => `<tr><td><p>${escapeHtml(key)}</p></td><td><p>${escapeHtml(value || '—')}</p></td></tr>`).join('') + '</tbody></table>';
}

export function metadataMarkdown(frontmatter) {
  return '## 文档信息\n\n| 项目 | 内容（可编辑） |\n| --- | --- |\n' + Object.entries(metadataValues(frontmatter)).map(([key, value]) => '| ' + key + ' | ' + (value || '—').replace(/\|/g,'\\|').replace(/\n/g,'<br/>') + ' |').join('\n');
}

export function frontmatterFromDocument(entry, parts, revision, modifiedTime) {
  const result = structuredClone(entry.frontmatter);
  const values = parts.metadata;
  const read = (key) => values[key] === '—' ? '' : values[key];
  const split = (text) => (text || '').split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean);
  result.title = parts.title.replace(/（试迁）$/, '');
  for (const [key, field] of [['作者','authors'],['标签','tags']]) if (key in values) result[field] = split(read(key));
  if ('适用阶段' in values) {
    const stages = split(read('适用阶段'));
    if (!stages.length || stages.some((s) => !['本科新生','本科低年级','本科高年级','研究生','全阶段'].includes(s))) throw new Error(entry.route + '：适用阶段不合法');
    result.stage = stages;
  }
  if ('内容状态' in values) {
    const state = ({'待核对':'draft','已定稿':'stable','已过期':'outdated',draft:'draft',stable:'stable',outdated:'outdated'})[read('内容状态')];
    if (!state) throw new Error(entry.route + '：内容状态不合法');
    result.status = state;
  }
  if ('最近人工核对' in values) {
    const date = read('最近人工核对');
    if (!date || date === '未标注') delete result.reviewedAt;
    else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || Date.parse(date) > Date.now()) throw new Error(entry.route + '：核对日期必须是真实的过去日期');
      result.reviewedAt = date;
    }
  }
  for (const [key, field] of [['页面摘要','description'],['卡片摘要','summary']]) if (key in values) result[field] = read(key) || entry.frontmatter[field] || '';
  result.sidebar ||= {};
  if ('导航名称' in values) { if (read('导航名称')) result.sidebar.label = read('导航名称'); else delete result.sidebar.label; }
  if ('导航顺序' in values && read('导航顺序')) { const order = Number(read('导航顺序')); if (!Number.isInteger(order)) throw new Error('导航顺序必须为整数'); result.sidebar.order = order; }
  if ('页首提示' in values) {
    const message = read('页首提示');
    if (!message) delete result.banner;
    else if (message !== plain(entry.frontmatter.banner?.content || '')) result.banner = {content:escapeHtml(message)};
  }
  if (result.hero && '首页副标题' in values) result.hero.tagline = read('首页副标题');
  result.editUrl = entry.url;
  result.lastUpdated = new Date(Number(modifiedTime) * 1000);
  result.feishu = {url:entry.url, revision};
  return result;
}

export function bodyToMarkdown(entry, parts, manifest) {
  const body = parts.body;
  const unsupported = nodes(body, 'img,source,whiteboard,sheet,bitable,grid,iframe,task,synced_reference,synced_source');
  if (unsupported.length) throw new Error(`${entry.route}：有尚未支持同步的飞书资源 ${unsupported[0].tagName}，本次停止发布`);
  for (const pre of nodes(body, 'pre[lang]')) { const code=pre.querySelector('code'); if (code) code.setAttribute('class','language-'+pre.getAttribute('lang')); }
  for (const link of nodes(body, 'a[href]')) {
    const href = link.getAttribute('href');
    const url = new URL(href, manifest.siteOrigin + entry.route);
    const target = manifest.documents.find((d) => url.pathname === '/docx/' + d.token && url.hostname.endsWith('.feishu.cn'));
    if (target) {
      const oldAnchor = url.searchParams.get('tsg_anchor') || Object.entries(target.headingAnchors || {}).find(([, id]) => '#' + id === url.hash)?.[0] || target.currentHeadingAnchors?.[url.hash.slice(1)];
      if (url.hash && !oldAnchor) throw new Error('未映射的飞书块锚点：'+href);
      link.setAttribute('href',target.route+(oldAnchor?'#'+encodeURIComponent(oldAnchor):''));
    } else if (url.origin === manifest.siteOrigin) link.setAttribute('href',url.pathname+url.search+url.hash);
    else if (!['https:','http:','mailto:','tel:'].includes(url.protocol)) throw new Error('不支持的链接协议：'+href);
  }
  let markdown = markdownConverter().turndown(body.body.innerHTML);
  const slots = [...markdown.matchAll(SLOT_PATTERN)].map((m) => m[1]);
  for (const name of slots) if (!SLOT_NAMES.has(name)) throw new Error('未知网站组件：'+name);
  for (const required of entry.slots || []) if (slots.filter((name) => name === required).length !== 1) throw new Error(entry.route+'：必须保留一个组件标记 '+required);
  markdown = markdown.replace(SLOT_PATTERN, (_, name) => `<div data-feishu-component="${name}"></div>`);
  return markdown.trim()+'\n';
}

export function sourceDocument(frontmatter, body) {
  return '---\n'+yamlStringify(frontmatter,{lineWidth:0}).trimEnd()+'\n---\n\n'+body.replace(/^>[\t ]+$/gm,'>');
}
