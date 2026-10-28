#!/usr/bin/env node
// One-time, resumable migration. Every remote ID is checkpointed before writing its body.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { documentOf, nodes, markdownConverter, metadataMarkdown, metadataXml, escapeHtml, partsFromXml } from './content.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const work=path.join(root,'.review/feishu-migration');
const progressFile=path.join(work,'progress.json');
await fs.mkdir(path.join(work,'payloads'),{recursive:true});
await fs.mkdir(path.join(work,'readback'),{recursive:true});
const parent='HgRZffnUjlF0End3geYclLCznWG';
const siteOrigin='https://thu.whizzzest.com';
const groups=[['home','首页与说明'],['ai','AI 功能'],['start','开始之前'],['freshman','新生入学'],['international','国际学生'],['academics','学业'],['courses','课程与资料'],['skills','技能入门'],['publicity','宣传与传播'],['research','科研与深造'],['campus','校园生活'],['mindset','心态与避坑'],['guides','实用工具'],['contribute','参与写作']].map(([id,label],i)=>({id,label,name:String(i).padStart(2,'0')+'_'+label}));
const pilot=JSON.parse(await fs.readFile(path.join(root,'../飞书迁移准备_2026-10-28/试迁记录.json'),'utf8'));
let state;
try{state=JSON.parse(await fs.readFile(progressFile,'utf8'));}catch{state={version:1,siteOrigin,parentFolderToken:parent,groups,documents:[]};}
let checkpoint=Promise.resolve();
function save(){const json=JSON.stringify(state,null,2)+'\n';checkpoint=checkpoint.then(async()=>{await fs.writeFile(progressFile+'.tmp',json);await fs.rename(progressFile+'.tmp',progressFile);});return checkpoint;}
async function cli(args,attempt=0){try{return await new Promise((resolve,reject)=>{const child=spawn('lark-cli',[...args,'--as','user'],{cwd:work,env:{...process.env,LARKSUITE_CLI_NO_UPDATE_NOTIFIER:'1',LARKSUITE_CLI_NO_SKILLS_NOTIFIER:'1'},stdio:['ignore','pipe','pipe']});const out=[],err=[];child.stdout.on('data',b=>out.push(b));child.stderr.on('data',b=>err.push(b));child.on('error',reject);child.on('close',code=>{if(code!==0)return reject(new Error('lark-cli '+args.slice(0,2).join(' ')+' '+code+' '+Buffer.concat(err).toString()));const x=JSON.parse(Buffer.concat(out).toString());if(x.ok!==true)return reject(new Error('CLI response not successful'));resolve(x);});});}catch(error){if(attempt<3&&/99991400|rate_limit/.test(error.message)){console.log('飞书限频，'+(15*(attempt+1))+' 秒后续跑同一项');await new Promise(r=>setTimeout(r,15000*(attempt+1)));return cli(args,attempt+1);}throw error;}}
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
function groupFor(id){if(id==='index')return 'home';if(['ask','qingxiaoda'].includes(id))return 'ai';if(id==='contribute')return 'contribute';if(id.startsWith('courses/')||['guides/archives','guides/course-codes-and-majors'].includes(id))return 'courses';return id.split('/')[0];}
function routeFor(id){return id==='index'?'/':'/'+id.replace(/\/index$/,'')+'/';}
const selectorSlots=[['[data-askbox]','AskBox'],['[data-planner]','CreditPlanner'],['[data-wb]','SelectionWorkbench'],['.home-stats','HomeStats'],['[data-course-explorer]','CourseExplorer']];

if(!state.documents.length){
 for(const file of (await walk(path.join(root,'src/content/docs'))).filter(p=>/\.mdx?$/.test(p)&&!path.basename(p).startsWith('_')&&!p.endsWith('/404.mdx')).sort()){
  const raw=await fs.readFile(file,'utf8');const header=raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);const frontmatter=parseYaml(header?.[1]||'');const id=path.relative(path.join(root,'src/content/docs'),file).replace(/\.mdx?$/,'');
  state.documents.push({id,source:path.relative(root,file),route:routeFor(id),title:frontmatter.title,frontmatter,group:groupFor(id),sourceSha256:createHash('sha256').update(raw).digest('hex')});
 }
 for(const [id,title,description] of [['courses','课程资料索引','按课程寻找往年题、笔记与参考资料。'],['courses/books','课程参考书目','按课程浏览公开资料库收录的参考书目。']])state.documents.push({id,source:'src/pages/'+id+(id==='courses'?'/index.astro':'.astro'),route:'/'+id+'/',title,group:'courses',customPage:true,frontmatter:{title,description,authors:['Nathan Penny'],stage:['全阶段'],tags:['课程','资料'],status:'stable',tableOfContents:false}});
 for(const entry of state.documents){
  const html=await fs.readFile(path.join(root,'dist',entry.route,'index.html'),'utf8');const dom=documentOf(html);const article=dom.querySelector('.sl-markdown-content');if(!article)throw Error('Missing rendered content '+entry.route);
  entry.headingSources=nodes(article,'h2,h3,h4,h5,h6').map(h=>({anchor:h.id,text:h.textContent.replace(/本节：.*/,'').trim()}));
  entry.slots=[];
  for(const [selector,name] of selectorSlots)for(const element of nodes(article,selector)){
   const replacement=dom.createElement('p');replacement.textContent='【网站组件：'+name+'】';element.parentNode.replaceChild(replacement,element);entry.slots.push(name);
  }
  for(const element of nodes(article,'script,style,svg,.sl-anchor-link,button,.link-toolbar,[data-checklist-count],.checklist__progress,.checklist__actions,.checklist__note'))element.remove();
  for(const input of nodes(article,'input[type="checkbox"]')){
   const label=input.closest('label');const text=label?.querySelector('span');if(text){const em=text.querySelector('em');if(em)em.textContent='（说明：'+em.textContent+'）';}
   input.parentNode.replaceChild(dom.createTextNode('[ ] '),input);
  }
  for(const link of nodes(article,'a[href]'))link.setAttribute('href',new URL(link.getAttribute('href'),siteOrigin+entry.route).href);
  entry.body=markdownConverter().turndown(article.innerHTML).replace(/^(\s*-\s+)\\\[ \\\]/gm,'$1[ ]').trim();
  const old=pilot.documents.find(d=>d.route===entry.route);
  if(old){entry.token=old.token;entry.url=old.url;entry.pilot=true;entry.bodyFilled=true;}
 }
 await save();console.log('准备了 '+state.documents.length+' 个页面');
}

if(process.argv.includes('--prepare-only'))process.exit(0);
for(const group of state.groups){if(group.token)continue;const r=await cli(['drive','+create-folder','--folder-token',parent,'--name',group.name]);group.token=r.data.folder_token;group.url=r.data.url;await save();console.log('栏目：'+group.label);}
// Creation stays serial within a folder. Native append operations below target distinct documents.
for(const group of state.groups){for(const entry of state.documents.filter(d=>d.group===group.id)){
 if(entry.token)continue;
 const r=await cli(['docs','+create','--title',entry.title,'--parent-token',group.token]);entry.token=r.data.document.document_id;entry.url=r.data.document.url;await save();console.log('创建 '+entry.title);await new Promise(r=>setTimeout(r,1000));
}}

function cloudHref(href){const u=new URL(href,siteOrigin);if(u.origin!==siteOrigin)return href;const target=state.documents.find(d=>d.route===u.pathname||d.route===u.pathname+'/');if(!target)return href;const out=new URL(target.url);if(u.hash)out.searchParams.set('tsg_anchor',decodeURIComponent(u.hash.slice(1)));return out.href;}
function rewriteBody(body){return body.replace(/\]\((https?:\/\/[^\s)]+)\)/g,(_,href)=>']('+cloudHref(href)+')').replace(/(<a\s+href=")([^"]+)(")/g,(_,a,href,b)=>a+escapeHtml(cloudHref(href.replace(/&amp;/g,'&')))+b);}

// Existing pilot documents retain their current cloud body and their IDs.
for(const entry of state.documents.filter(d=>d.pilot&&!d.promoted)){
 let r=await cli(['docs','+fetch','--doc',entry.token,'--doc-format','xml','--detail','full']);
 await fs.writeFile(path.join(work,'readback',entry.token+'-before.xml.json'),JSON.stringify(r,null,2));
 let parts=partsFromXml(r.data.document.content);
 const test=nodes(parts.body,'p').find(p=>/^同步验证（2026-10-28）：本段在飞书修改后已?同步到网站预览。关联试迁文档：/.test(p.textContent));
 if(test){await cli(['docs','+update','--doc',entry.token,'--command','block_delete','--block-id',test.id,'--revision-id',String(r.data.document.revision_id)]);r=await cli(['docs','+fetch','--doc',entry.token,'--doc-format','xml','--detail','full']);parts=partsFromXml(r.data.document.content);}
 const children=Array.from(parts.dom.body.children);const intro=children.slice(0,children.indexOf(parts.beginNode)).filter(e=>e.id&&e.tagName!=='TITLE');
 if(intro.length)await cli(['docs','+update','--doc',entry.token,'--command','block_replace','--start-block-id',intro[0].id,'--end-block-id',intro.at(-1).id,'--revision-id',String(r.data.document.revision_id),'--content',metadataXml(entry.frontmatter)]);
 await cli(['drive','+update-title','--token',entry.token,'--type','docx','--title',entry.title]);
 await cli(['drive','+move','--file-token',entry.token,'--type','docx','--folder-token',state.groups.find(g=>g.id===entry.group).token]);
 entry.promoted=true;await save();console.log('沿用试迁稿 '+entry.title);
}

let next=0;const queue=state.documents.filter(d=>!d.bodyFilled);
async function writer(){for(;;){const index=next++;if(index>=queue.length)return;const entry=queue[index];
 const check=await cli(['docs','+fetch','--doc',entry.token,'--doc-format','xml']);
 if(check.data.document.content.includes('<h2')&&check.data.document.content.includes('迁移信息')){entry.bodyFilled=true;await save();continue;}
 if(documentOf(check.data.document.content).body.textContent.trim().replace(entry.title,'').trim())throw Error('文档非空，停止以免重复追加：'+entry.title);
 const payload=metadataMarkdown(entry.frontmatter)+'\n\n## 正文\n\n'+rewriteBody(entry.body)+'\n\n## 迁移信息\n\n原网站：['+entry.title+']('+siteOrigin+entry.route+')。内容许可 CC BY-NC-SA 4.0，保留原作者署名。\n\n正文与文档信息在飞书维护；请保留“正文”“迁移信息”两个分界标题及网站组件标记。\n';
 const filename='payloads/'+entry.id.replaceAll('/','__')+'.md';await fs.writeFile(path.join(work,filename),payload);
 const r=await cli(['docs','+update','--doc',entry.token,'--command','append','--doc-format','markdown','--content','@./'+filename]);
 if(r.data.result!=='success'||r.data.warnings?.length)throw Error('写入未完全成功：'+entry.title+' '+JSON.stringify(r.data));
 entry.bodyFilled=true;await save();console.log('写入 '+entry.title);
}}
await Promise.all([writer(),writer(),writer()]);
await checkpoint;
console.log('所有正文已写入。下一步回读校验并生成正式映射。');
