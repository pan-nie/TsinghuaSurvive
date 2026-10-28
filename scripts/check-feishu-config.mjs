// Optional validation of a retained Feishu export; not part of the Git website checks.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
const root=path.resolve(import.meta.dirname,'..');
const outputIndex=process.argv.indexOf('--output');
if(outputIndex!==-1&&!process.argv[outputIndex+1])throw Error('--output 需要导出目录');
const output=path.resolve(root,outputIndex===-1?'.review/feishu-export':process.argv[outputIndex+1]);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/data/feishu-manifest.json'),'utf8'));
const custom=JSON.parse(fs.readFileSync(path.join(output,'src/data/feishu-custom.json'),'utf8'));
const state=JSON.parse(fs.readFileSync(path.join(output,'src/data/feishu-state.json'),'utf8'));
const tokens=new Set(),routes=new Set();
for(const d of manifest.documents){
  assert(!tokens.has(d.token),'飞书文档重复映射');tokens.add(d.token);
  assert(!routes.has(d.route),'网站路径重复映射');routes.add(d.route);
  assert(manifest.groups.some(g=>g.id===d.group),'缺少原栏目');
  let data;
  if(d.customPage){assert(custom[d.route],'缺少自定义页导出');data=custom[d.route].frontmatter;}
  else{
    const file=d.source.replace(/\.mdx$/,'.md');
    const raw=fs.readFileSync(path.join(output,file),'utf8');
    data=parse(raw.match(/^---\n([\s\S]*?)\n---/)[1]);
  }
  assert.equal(data.editUrl,d.url,'导出来源链接不一致');
  assert.equal(data.feishu.url,d.url,'导出元信息不一致');
  assert.equal(state.documents[d.token]?.route,d.route,'导出版本记录不一致');
}
console.log(`飞书独立导出检查通过：${routes.size} 篇、${manifest.groups.length} 个栏目；正式网站未参与检查`);
