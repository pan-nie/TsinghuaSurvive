import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
test('增量导出识别同版本改名，且任一文档转换失败时不替换整批站点副本',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'feishu-sync-test-'));
 try{
  for(const folder of ['scripts/feishu','src/data','src/content/docs','public','.feishu-cache'])await fs.mkdir(path.join(dir,folder),{recursive:true});
  await fs.symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
  await fs.copyFile(path.join(root,'scripts/sync-feishu.mjs'),path.join(dir,'scripts/sync-feishu.mjs'));
  await fs.copyFile(path.join(root,'scripts/feishu/content.mjs'),path.join(dir,'scripts/feishu/content.mjs'));
  const documents=['a','b'].map(token=>({token,route:'/'+token+'/',url:'https://my.feishu.cn/docx/'+token,source:'src/content/docs/'+token+'.md',frontmatter:{title:token},headingSources:[],slots:[]}));
  const manifest={version:1,siteOrigin:'https://thu.whizzzest.com',documents};
  await fs.writeFile(path.join(dir,'src/data/feishu-manifest.json'),JSON.stringify(manifest));
  const index={version:1,manifestHash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),documents:{}};
  const xml=title=>`<title>${title}</title><h2>正文</h2><p>正文内容</p><h2>迁移信息</h2>`;
  for(const e of documents){index.documents[e.token]={meta:{doc_token:e.token,title:e.token,latest_modify_time:'1793152800'},revision:3};await fs.writeFile(path.join(dir,'.feishu-cache/'+e.token+'.json'),JSON.stringify({document_id:e.token,revision_id:3,content:xml(e.token)}));}
  await fs.writeFile(path.join(dir,'.feishu-cache/index.json'),JSON.stringify(index));
  function run(){return spawnSync(process.execPath,['scripts/sync-feishu.mjs','--cached'],{cwd:dir,encoding:'utf8'});}
  let result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changed,true);
  result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changed,false);
  await fs.writeFile(path.join(dir,'.feishu-cache/a.json'),JSON.stringify({document_id:'a',revision_id:3,content:xml('新标题')}));
  const current=JSON.parse(await fs.readFile(path.join(dir,'.feishu-cache/index.json')));current.documents.a.meta.title='新标题';await fs.writeFile(path.join(dir,'.feishu-cache/index.json'),JSON.stringify(current));
  result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changed,true);
  const source=await fs.readFile(path.join(dir,'src/content/docs/a.md'),'utf8');assert(source.includes('新标题'));
  const state=await fs.readFile(path.join(dir,'src/data/feishu-state.json'),'utf8');
  await fs.writeFile(path.join(dir,'.feishu-cache/b.json'),JSON.stringify({document_id:'b',revision_id:4,content:xml('b').replace('<p>正文内容</p>','<img token="unsupported"/>')}));
  result=run();assert.notEqual(result.status,0);assert(result.stderr.includes('尚未支持'));
  assert.equal(await fs.readFile(path.join(dir,'src/content/docs/a.md'),'utf8'),source);assert.equal(await fs.readFile(path.join(dir,'src/data/feishu-state.json'),'utf8'),state);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
