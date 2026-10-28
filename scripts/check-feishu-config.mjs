import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
const manifest=JSON.parse(fs.readFileSync('src/data/feishu-manifest.json','utf8'));
const tokens=new Set(), routes=new Set();
for(const d of manifest.documents){
  assert(!tokens.has(d.token),'飞书文档重复映射'); tokens.add(d.token);
  assert(!routes.has(d.route),'网站路径重复映射'); routes.add(d.route);
  assert(manifest.groups.some(g=>g.id===d.group),'缺少原栏目');
  if(d.customPage)continue;
  const file=d.source.replace(/\.mdx$/,'.md');
  const raw=fs.readFileSync(file,'utf8');
  const data=parse(raw.match(/^---\n([\s\S]*?)\n---/)[1]);
  assert.equal(data.editUrl,d.url,'编辑按钮没有指向飞书');
  assert.equal(data.feishu.url,d.url,'来源元信息不一致');
  if(file!==d.source)assert(!fs.existsSync(d.source),'遗留 MDX 造成重复页面');
}
const html=fs.readFileSync('public/admin/index.html','utf8');
assert(html.includes('/docx/'+manifest.navigationDocumentToken),'维护入口未指向飞书总导航');
assert(/name="robots" content="noindex/.test(html),'维护入口缺少 noindex');
assert(!/<script[^>]*src=.*sveltia/i.test(html),'旧编辑器仍在加载');
console.log(`飞书内容配置通过：${routes.size} 篇、${manifest.groups.length} 个栏目、固定路径与编辑入口一致`);
