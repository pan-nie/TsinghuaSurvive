#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { partsFromXml, frontmatterFromDocument, bodyToMarkdown, sourceDocument, nodes, escapeHtml, markdownConverter } from './feishu/content.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Retained as a read-only cloud export tool. Never overwrite the Git-authored website.
const outputIndex=process.argv.indexOf('--output');
if(outputIndex!==-1&&(!process.argv[outputIndex+1]||process.argv[outputIndex+1].startsWith('--')))throw Error('--output 需要一个 .review/ 下的导出目录');
const outputRoot=path.resolve(root,outputIndex===-1?'.review/feishu-export':process.argv[outputIndex+1]);
const reviewRoot=path.join(root,'.review');
const relativeOutput=path.relative(reviewRoot,outputRoot);
if(!relativeOutput||relativeOutput==='..'||relativeOutput.startsWith('..'+path.sep)||path.isAbsolute(relativeOutput))throw Error('飞书导出只能写入 .review/ 的子目录，不能覆盖正式网站');
// Reject symlinks which could redirect an otherwise safe output path into website sources.
async function assertNoSymlinks(target){
 for(let dir=target;dir!==root;dir=path.dirname(dir)){
  try{if((await fs.lstat(dir)).isSymbolicLink())throw Error('飞书导出目录不能包含符号链接');}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
await assertNoSymlinks(outputRoot);
const manifest=JSON.parse(await fs.readFile(path.join(root,'src/data/feishu-manifest.json'),'utf8'));
const cacheDir=path.join(root,'.feishu-cache');
await fs.mkdir(cacheDir,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifestHash=hash(JSON.stringify(manifest));
let cache={version:1,manifestHash,documents:{}};
try{const old=JSON.parse(await fs.readFile(path.join(cacheDir,'index.json'),'utf8'));if(old.manifestHash===manifestHash)cache=old;}catch{}
const cachedOnly=process.argv.includes('--cached');
const force=process.argv.includes('--force');
const renderer=await createSatteriMarkdownProcessor();

async function cli(args,attempt=0){
 try{return await new Promise((resolve,reject)=>{
  const p=spawn('lark-cli',[...args,'--as',process.env.FEISHU_IDENTITY||'bot'],{cwd:root,env:{...process.env,LARKSUITE_CLI_NO_UPDATE_NOTIFIER:'1',LARKSUITE_CLI_NO_SKILLS_NOTIFIER:'1'},stdio:['ignore','pipe','pipe']});
  const out=[],err=[];p.stdout.on('data',b=>out.push(b));p.stderr.on('data',b=>err.push(b));p.on('error',reject);p.on('close',code=>{
   if(code!==0)return reject(Error('飞书读取失败：'+Buffer.concat(err).toString()));
   try{const x=JSON.parse(Buffer.concat(out).toString());if(!x.ok)throw Error('CLI returned ok=false');resolve(x.data);}catch(e){reject(e);}
  });
 });}catch(error){
  if(attempt<2&&/99991400|rate.limit|temporar|ECONNRESET|ETIMEDOUT/i.test(error.message)){await new Promise(r=>setTimeout(r,1000*2**attempt));return cli(args,attempt+1);}
  throw error;
 }
}

let metas;
if(cachedOnly){metas=Object.values(cache.documents).map(d=>d.meta);if(metas.length!==manifest.documents.length)throw Error('本地缓存不完整，请先联网同步');}
else{
 const response=await cli(['drive','metas','batch_query','--data',JSON.stringify({request_docs:manifest.documents.map(d=>({doc_token:d.token,doc_type:'docx'})),with_url:true})]);
 if(response.failed_list?.length||response.metas?.length!==manifest.documents.length)throw Error('飞书有文档不可访问，本次保留上一版站点');
 metas=response.metas.map(({doc_token,title,latest_modify_time})=>({doc_token,title,latest_modify_time}));
}
const nextCache={version:1,manifestHash,documents:{}};
const results=new Map();const rawDocuments=new Map();let cursor=0;let fetched=0;
async function reader(){for(;;){const entry=manifest.documents[cursor++];if(!entry)return;
 const meta=metas.find(m=>m.doc_token===entry.token);if(!meta)throw Error('缺少元数据：'+entry.route);
 const old=cache.documents[entry.token];let doc;
 if(!force&&old&&old.meta.latest_modify_time===meta.latest_modify_time&&old.meta.title===meta.title){
  try{doc=JSON.parse(await fs.readFile(path.join(cacheDir,entry.token+'.json'),'utf8'));}catch{}
 }
 if(!doc){if(cachedOnly)throw Error('缺少文档缓存：'+entry.route);const response=await cli(['docs','+fetch','--doc',entry.token,'--doc-format','xml','--detail','full']);const full=response.document;if(full?.document_id!==entry.token)throw Error('文档 ID 不一致');doc={document_id:full.document_id,revision_id:full.revision_id,content:full.content};await fs.writeFile(path.join(cacheDir,entry.token+'.json'),JSON.stringify(doc));fetched++;}
 rawDocuments.set(entry.token,{doc,meta});
}}
await Promise.all([reader(),reader(),reader()]);
const runtimeManifest=structuredClone(manifest);
for(const entry of runtimeManifest.documents){
 const parts=partsFromXml(rawDocuments.get(entry.token).doc.content);
 const headings=nodes(parts.body,'h1,h2,h3,h4,h5,h6');
 const rendered=await renderer.render(markdownConverter().turndown(parts.body.body.innerHTML));
 if(headings.length!==rendered.metadata.headings.length)throw Error(entry.route+'：标题结构转换不完整');
 entry.currentHeadingAnchors=Object.fromEntries(headings.map((h,i)=>[h.id,rendered.metadata.headings[i].slug]));
}
for(const entry of manifest.documents){
 const {doc,meta}=rawDocuments.get(entry.token);
 const parts=partsFromXml(doc.content);
 const frontmatter=frontmatterFromDocument(entry,parts,doc.revision_id,meta.latest_modify_time);
 let body=bodyToMarkdown(entry,parts,runtimeManifest);
 // Retain old section URLs even when a heading is renamed in Feishu.
 const rendered=await renderer.render(body);
 const currentIds=new Set(rendered.metadata.headings.map(h=>h.slug));
 const aliases=(entry.headingSources||[]).filter(h=>h.anchor&&!currentIds.has(h.anchor));
 if(aliases.length)body=aliases.map(h=>`<span id="${escapeHtml(h.anchor)}" data-feishu-anchor></span>`).join('\n')+'\n\n'+body;
 const nativeTableCells=nodes(parts.body,'table').map(t=>nodes(t,'tr').map(row=>Array.from(row.children).filter(c=>['TH','TD'].includes(c.tagName)).map(c=>c.textContent.replace(/\s+/g,''))));
 const renderedAgain=await renderer.render(body);
 // Structural agreement catches export degradation before any source file is replaced.
 const {documentOf}=await import('./feishu/content.mjs');const html=documentOf(renderedAgain.code);
 const renderedTableCells=nodes(html,'table').map(t=>nodes(t,'tr').map(row=>Array.from(row.children).filter(c=>['TH','TD'].includes(c.tagName)).map(c=>c.textContent.replace(/\s+/g,''))));
 if(JSON.stringify(nativeTableCells)!==JSON.stringify(renderedTableCells))throw Error(entry.route+'：表格转换不完整');
 if(nodes(parts.body,'checkbox').length!==nodes(html,'input[type="checkbox"]').length)throw Error(entry.route+'：待办转换不完整');
 const bodyHash=hash(body), metadataHash=hash(JSON.stringify(frontmatter));nextCache.documents[entry.token]={meta,revision:doc.revision_id,bodyHash,metadataHash};
 results.set(entry.token,{entry,frontmatter,body,headings:renderedAgain.metadata.headings,bodyHash,metadataHash,revision:doc.revision_id});
}

let previous={documents:{}};
try{previous=JSON.parse(await fs.readFile(path.join(outputRoot,'src/data/feishu-state.json'),'utf8'));}catch{}
const changed=manifest.documents.some(entry=>previous.documents[entry.token]?.bodyHash!==results.get(entry.token).bodyHash||previous.documents[entry.token]?.metadataHash!==results.get(entry.token).metadataHash||previous.documents[entry.token]?.revision!==results.get(entry.token).revision);
const stage=path.join(cacheDir,'stage-'+randomUUID());await fs.mkdir(stage,{recursive:true});
const writes=[];const custom={};
for(const entry of manifest.documents){
 const result=results.get(entry.token);
 if(entry.customPage){custom[entry.route]={frontmatter:result.frontmatter,body:result.body,html:(await renderer.render(result.body)).code,headings:result.headings};continue;}
 if(!/^src\/content\/docs\/[a-z0-9/-]+\.mdx?$/.test(entry.source))throw Error('不允许的生成路径：'+entry.source);
 const target=entry.source.replace(/\.mdx$/,'.md');const staged=path.join(stage,target);await fs.mkdir(path.dirname(staged),{recursive:true});await fs.writeFile(staged,sourceDocument(result.frontmatter,result.body));writes.push({entry,target,staged});
}
const state={syncedAt:new Date().toISOString(),documents:Object.fromEntries([...results.values()].map(r=>[r.entry.token,{route:r.entry.route,url:r.entry.url,revision:r.revision,bodyHash:r.bodyHash,metadataHash:r.metadataHash}]))};
for(const target of [...writes.flatMap(({entry,target})=>[target,entry.source]),'src/data/feishu-custom.json','src/data/feishu-state.json','public/content-version.json'])await assertNoSymlinks(path.join(outputRoot,target));
// All network reads and transformations have succeeded; apply the complete batch.
for(const {entry,target,staged} of writes){await fs.mkdir(path.dirname(path.join(outputRoot,target)),{recursive:true});await fs.copyFile(staged,path.join(outputRoot,target));if(target!==entry.source)await fs.rm(path.join(outputRoot,entry.source),{force:true});}
await fs.mkdir(path.join(outputRoot,'src/data'),{recursive:true});
await fs.mkdir(path.join(outputRoot,'public'),{recursive:true});
await fs.writeFile(path.join(outputRoot,'src/data/feishu-custom.json'),JSON.stringify(custom,null,2)+'\n');
await fs.writeFile(path.join(outputRoot,'src/data/feishu-state.json'),JSON.stringify(state,null,2)+'\n');
await fs.writeFile(path.join(outputRoot,'public/content-version.json'),JSON.stringify(state)+'\n');
await fs.writeFile(path.join(cacheDir,'index.json'),JSON.stringify(nextCache,null,2)+'\n');
await fs.rm(stage,{recursive:true,force:true});
if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\n`);
console.log(JSON.stringify({documents:manifest.documents.length,fetched,reused:manifest.documents.length-fetched,changed,siteOrigin:manifest.siteOrigin,output:outputRoot},null,2));
