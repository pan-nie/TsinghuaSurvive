import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
test('独立导出识别同版本改名，转换失败保留旧导出，且不能覆盖 Git 主稿',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'feishu-sync-test-'));
 try{
  for(const folder of ['scripts/feishu','src/data','src/content/docs','public','.feishu-cache'])await fs.mkdir(path.join(dir,folder),{recursive:true});
  await fs.symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
  await fs.copyFile(path.join(root,'scripts/sync-feishu.mjs'),path.join(dir,'scripts/sync-feishu.mjs'));
  await fs.copyFile(path.join(root,'scripts/feishu/content.mjs'),path.join(dir,'scripts/feishu/content.mjs'));
  const documents=['a','b'].map(token=>({token,route:'/'+token+'/',url:'https://my.feishu.cn/docx/'+token,source:'src/content/docs/'+token+'.md',frontmatter:{title:token},headingSources:[],slots:[]}));
  const manifest={version:1,siteOrigin:'https://thu.whizzzest.com',documents};
  await fs.writeFile(path.join(dir,'src/data/feishu-manifest.json'),JSON.stringify(manifest));
  const output=path.join(dir,'.review/feishu-export');
  const protectedSource=path.join(dir,'src/content/docs/a.md');
  await fs.writeFile(protectedSource,'Git 主稿，不能被飞书覆盖');
  await fs.writeFile(path.join(dir,'src/content/docs/a.mdx'),'Git MDX 主稿，不能被删除');
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
  const source=await fs.readFile(path.join(output,'src/content/docs/a.md'),'utf8');assert(source.includes('新标题'));
  const state=await fs.readFile(path.join(output,'src/data/feishu-state.json'),'utf8');
  await fs.writeFile(path.join(dir,'.feishu-cache/b.json'),JSON.stringify({document_id:'b',revision_id:4,content:xml('b').replace('<p>正文内容</p>','<img token="unsupported"/>')}));
  result=run();assert.notEqual(result.status,0);assert(result.stderr.includes('尚未支持'));
  assert.equal(await fs.readFile(path.join(output,'src/content/docs/a.md'),'utf8'),source);assert.equal(await fs.readFile(path.join(output,'src/data/feishu-state.json'),'utf8'),state);
  assert.equal(await fs.readFile(protectedSource,'utf8'),'Git 主稿，不能被飞书覆盖');
  assert.equal(await fs.readFile(path.join(dir,'src/content/docs/a.mdx'),'utf8'),'Git MDX 主稿，不能被删除');
  for(const target of ['.','src/content/docs','.review/../src']){
   result=spawnSync(process.execPath,['scripts/sync-feishu.mjs','--cached','--output',target],{cwd:dir,encoding:'utf8'});
   assert.notEqual(result.status,0);assert(result.stderr.includes('不能覆盖正式网站'));
  }
  await fs.mkdir(path.join(dir,'.review/linked'),{recursive:true});
  await fs.symlink(path.join(dir,'src'),path.join(dir,'.review/linked/source'),'dir');
  result=spawnSync(process.execPath,['scripts/sync-feishu.mjs','--cached','--output','.review/linked/source/export'],{cwd:dir,encoding:'utf8'});
  assert.notEqual(result.status,0);assert(result.stderr.includes('不能包含符号链接'));
  await fs.writeFile(path.join(dir,'.feishu-cache/b.json'),JSON.stringify({document_id:'b',revision_id:3,content:xml('b')}));
  const versionFile=path.join(output,'public/content-version.json');
  await fs.rm(versionFile);await fs.symlink(protectedSource,versionFile);
  result=run();assert.notEqual(result.status,0);assert(result.stderr.includes('不能包含符号链接'));
  assert.equal(await fs.readFile(protectedSource,'utf8'),'Git 主稿，不能被飞书覆盖');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
