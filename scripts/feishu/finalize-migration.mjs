#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { partsFromXml, documentOf, nodes } from './content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const work=path.join(root,'.review/feishu-migration');
const progressPath=path.join(work,'progress.json');
const state=JSON.parse(await fs.readFile(progressPath,'utf8'));
if(state.documents.some(d=>!d.bodyFilled))throw Error('还有正文没有写入，先完成 migrate.mjs');
async function cli(args,identity='bot',attempt=0){try{return await new Promise((resolve,reject)=>{const p=spawn('lark-cli',[...args,'--as',identity],{cwd:work,env:{...process.env,LARKSUITE_CLI_NO_UPDATE_NOTIFIER:'1',LARKSUITE_CLI_NO_SKILLS_NOTIFIER:'1'},stdio:['ignore','pipe','pipe']});const out=[],err=[];p.stdout.on('data',b=>out.push(b));p.stderr.on('data',b=>err.push(b));p.on('error',reject);p.on('close',code=>{if(code!==0)return reject(Error(Buffer.concat(err).toString()));const x=JSON.parse(Buffer.concat(out).toString());if(!x.ok)return reject(Error('CLI returned ok=false'));resolve(x.data);});});}catch(e){if(attempt<3&&/99991400|rate_limit/.test(e.message)){await new Promise(r=>setTimeout(r,15000*(attempt+1)));return cli(args,identity,attempt+1);}throw e;}}
let checkpoint=Promise.resolve();function save(){const json=JSON.stringify(state,null,2)+'\n';checkpoint=checkpoint.then(()=>fs.writeFile(progressPath,json));return checkpoint;}
async function read(entry){if(process.argv.includes('--cached-readback'))return JSON.parse(await fs.readFile(path.join(work,'readback',entry.token+'.xml.json'),'utf8'));const d=(await cli(['docs','+fetch','--doc',entry.token,'--doc-format','xml','--detail','full'])).document;await fs.writeFile(path.join(work,'readback',entry.token+'.xml.json'),JSON.stringify(d,null,2));return d;}
let cursor=0;
async function readInitial(){for(;;){const entry=state.documents[cursor++];if(!entry)return;const doc=await read(entry);const parts=partsFromXml(doc.content);const headings=nodes(parts.body,'h1,h2,h3,h4,h5,h6');const used=new Set();entry.headingAnchors={};
 for(const source of entry.headingSources||[]){const heading=headings.find(h=>h.textContent.trim()===source.text&&!used.has(h.id));if(heading&&source.anchor){entry.headingAnchors[source.anchor]=heading.id;used.add(heading.id);}}
 entry.revision=doc.revision_id;await save();console.log('回读 '+entry.title);
}}
await Promise.all([readInitial(),readInitial(),readInitial()]);await checkpoint;

function hrefFor(href){let u;try{u=new URL(href,state.siteOrigin);}catch{return href;}let target;
 if(u.origin===state.siteOrigin){target=state.documents.find(d=>d.route===u.pathname||d.route===u.pathname+'/');if(!target)return href;const anchor=u.hash?decodeURIComponent(u.hash.slice(1)):'';const out=new URL(target.url);if(anchor){const block=target.headingAnchors?.[anchor];if(block)out.hash=block;else out.searchParams.set('tsg_anchor',anchor);}return out.href;}
 target=state.documents.find(d=>u.pathname==='/docx/'+d.token&&u.hostname.endsWith('.feishu.cn'));
 if(target&&u.searchParams.has('tsg_anchor')){const anchor=u.searchParams.get('tsg_anchor');const block=target.headingAnchors?.[anchor];if(block){u.searchParams.delete('tsg_anchor');u.hash=block;return u.href;}}
 return href;
}
function xmlOf(element){const clone=element.cloneNode(true);for(const e of [clone,...nodes(clone,'*')]){e.removeAttribute('id');e.removeAttribute('seq-marker');}return clone.outerHTML.replace(/<(br|hr|img|source|col)(\s[^>]*?)?>/g,(s)=>s.endsWith('/>')?s:s.slice(0,-1)+'/>' );}

for(const entry of state.documents){if(entry.linksFinalized)continue;let count=0;
 for(;;){const doc=await read(entry);const parts=partsFromXml(doc.content);const link=nodes(parts.body,'a[href]').find(a=>hrefFor(a.getAttribute('href'))!==a.getAttribute('href'));if(!link)break;
  const block=link.closest('[id]');if(!block?.id)throw Error('链接没有可安全更新的块：'+entry.route);
  for(const a of nodes(block,'a[href]'))a.setAttribute('href',hrefFor(a.getAttribute('href')));
  const response=await cli(['docs','+update','--doc',entry.token,'--command','block_replace','--block-id',block.id,'--revision-id',String(doc.revision_id),'--content',xmlOf(block)],'user');
  if(response.result!=='success'||response.warnings?.length)throw Error('链接更新不完整：'+entry.route);
  if(++count>100)throw Error('链接更新未收敛：'+entry.route);
 }
 entry.linksFinalized=true;entry.linkBlocksUpdated=count;await save();if(count)console.log('链接 '+entry.title+'：'+count+' 块');
}

const renderer=await createSatteriMarkdownProcessor();
const normalize=s=>s.replace(/[\s\p{P}\p{S}]/gu,'').normalize('NFKC');
const checks=[];
const failures=[];
for(const entry of state.documents){
 const doc=await read(entry);const parts=partsFromXml(doc.content);const expected=documentOf((await renderer.render(entry.body)).code);
 const cellMatrix=dom=>nodes(dom,'table').map(t=>nodes(t,'tr').map(row=>Array.from(row.children).filter(c=>['TH','TD'].includes(c.tagName)).map(c=>c.textContent.replace(/\s+/g,''))));
 const tablesMatch=JSON.stringify(cellMatrix(expected))===JSON.stringify(cellMatrix(parts.body));
 const sourceTasks=nodes(expected,'input[type="checkbox"]').length;const nativeTasks=nodes(parts.body,'checkbox').length;
 const codeBlocksMatch=nodes(expected,'pre').length===nodes(parts.body,'pre').length;
 const actual=normalize(parts.body.body.textContent);
 const missing=entry.pilot?[]:nodes(expected,'p,li,td,th').map(e=>normalize(e.textContent)).filter(t=>t.length>5&&!actual.includes(t));
 const result={route:entry.route,title:entry.title,revision:doc.revision_id,tables:nodes(parts.body,'table').length,tablesMatch,todos:nativeTasks,todosMatch:sourceTasks===nativeTasks,codeBlocks:nodes(parts.body,'pre').length,codeBlocksMatch,missingText:missing.slice(0,5)};
 if(!tablesMatch||sourceTasks!==nativeTasks||!codeBlocksMatch||missing.length)failures.push(result);
 checks.push(result);entry.revision=doc.revision_id;
}
if(failures.length){await fs.writeFile(path.join(work,'verification-failures.json'),JSON.stringify(failures,null,2));throw Error('正文核验不完整：'+failures.map(f=>f.title).join('、'));}
await save();
const manifest={version:1,siteOrigin:state.siteOrigin,parentFolderToken:state.parentFolderToken,navigationDocumentToken:'S2FVdp173oWkY4x0v2dcKCcIn0f',groups:state.groups,documents:state.documents.map(({body,sourceSha256,pilot,bodyFilled,promoted,linksFinalized,linkBlocksUpdated,...entry})=>entry)};
await fs.writeFile(path.join(root,'src/data/feishu-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(work,'readback-verification.json'),JSON.stringify({documents:checks.length,checks},null,2)+'\n');
// Seed the incremental cache from the exact verified versions, excluding comments/reference sidecars.
const metadata=await cli(['drive','metas','batch_query','--data',JSON.stringify({request_docs:manifest.documents.map(d=>({doc_token:d.token,doc_type:'docx'})),with_url:true})]);
if(metadata.failed_list?.length)throw Error('元数据读取失败');
const cache={version:1,manifestHash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),documents:{}};
await fs.mkdir(path.join(root,'.feishu-cache'),{recursive:true});
for(const entry of manifest.documents){const doc=JSON.parse(await fs.readFile(path.join(work,'readback',entry.token+'.xml.json'),'utf8'));const m=metadata.metas.find(m=>m.doc_token===entry.token);const meta={doc_token:m.doc_token,title:m.title,latest_modify_time:m.latest_modify_time};cache.documents[entry.token]={meta,revision:doc.revision_id};await fs.writeFile(path.join(root,'.feishu-cache',entry.token+'.json'),JSON.stringify({document_id:doc.document_id,revision_id:doc.revision_id,content:doc.content}));}
await fs.writeFile(path.join(root,'.feishu-cache/index.json'),JSON.stringify(cache,null,2)+'\n');
console.log(JSON.stringify({documents:checks.length,tables:checks.reduce((n,d)=>n+d.tables,0),todos:checks.reduce((n,d)=>n+d.todos,0),codeBlocks:checks.reduce((n,d)=>n+d.codeBlocks,0)},null,2));
