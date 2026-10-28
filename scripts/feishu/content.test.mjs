import test from 'node:test';
import assert from 'node:assert/strict';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { partsFromXml, bodyToMarkdown, frontmatterFromDocument, metadataXml, documentOf, nodes } from './content.mjs';
import { enhanceLinkDirectory, enhanceHomeContent } from '../../src/utils/feishu-directory.mjs';
const entry={route:'/freshman/demo/',token:'demo',url:'https://my.feishu.cn/docx/demo',frontmatter:{title:'原题',authors:['甲'],stage:['全阶段'],status:'stable',banner:{content:'<b>原提示</b>'}},slots:[]};
const target={route:'/academics/gpa/',token:'gpa',headingAnchors:{'成绩换算':'nativeHeading'}};
const manifest={siteOrigin:'https://thu.whizzzest.com',documents:[entry,target]};
function xml(body,meta=metadataXml(entry.frontmatter)){return `<title>新题</title>${meta}<h2>正文</h2>${body}<h2>迁移信息</h2><p>不会发布的后台说明</p>`;}
const renderer=await createSatteriMarkdownProcessor();
test('只发布正文，元信息和迁移备注保留在编辑端',()=>{
 const parts=partsFromXml(xml('<h2>测试</h2><p>可见文字</p>'));
 const body=bodyToMarkdown(entry,parts,manifest);
 assert(body.includes('可见文字'));assert(!body.includes('不会发布'));assert(!body.includes('文档信息'));
 assert.throws(()=>partsFromXml('<title>x</title><p>缺少分界</p>'),/分界/);
});
test('跨文章和章节链接回到原网址，本页片段保留正确路径',()=>{
 const body=bodyToMarkdown(entry,partsFromXml(xml('<p><a href="https://my.feishu.cn/docx/gpa#nativeHeading">绩点</a> <a href="#原节">本页</a></p>')),manifest);
 assert(body.includes('/academics/gpa/#'+encodeURIComponent('成绩换算')));assert(body.includes('/freshman/demo/#'));
 assert.throws(()=>bodyToMarkdown(entry,partsFromXml(xml('<p><a href="https://my.feishu.cn/docx/gpa#notMapped">错误</a></p>')),manifest),/未映射/);
});
test('表格中的换行、管道符、中文加粗和代码不会破坏列结构',async()=>{
 const source='<table><tr><td>列一</td><td>列二</td></tr><tr><td><b>「中文」</b><br/>下一行</td><td><code>a\\|b</code></td></tr></table>';
 const body=bodyToMarkdown(entry,partsFromXml(xml(source)),manifest);
 const dom=documentOf((await renderer.render(body)).code);
 assert.equal(nodes(dom,'tr').length,2);assert.equal(nodes(dom,'td').length,2);
 assert.equal(dom.querySelector('b').textContent,'「中文」');assert.equal(dom.querySelector('code').textContent,'a\\|b');
});
test('原生待办变为独立读者清单，代码块不丢转义字符',async()=>{
 const body=bodyToMarkdown(entry,partsFromXml(xml('<checkbox done="true">证件</checkbox><pre lang="python"><code>if a &lt; 2:\n  print("你好")</code></pre>')),manifest);
 const dom=documentOf((await renderer.render(body)).code);
 assert.equal(nodes(dom,'input[type="checkbox"]').length,1);assert(!dom.querySelector('input').hasAttribute('checked'));
 assert(dom.querySelector('pre').textContent.includes('if a < 2:'));
});
test('必要互动组件标记被删除会停止同步',()=>{
 const tool={...entry,slots:['AskBox']};
 assert.throws(()=>bodyToMarkdown(tool,partsFromXml(xml('<p>没有标记</p>')),manifest),/必须保留/);
 assert(bodyToMarkdown(tool,partsFromXml(xml('<p>【网站组件：AskBox】</p>')),manifest).includes('data-feishu-component="AskBox"'));
});
test('非法链接或尚未支持的富媒体不能静默发布',()=>{
 for(const body of ['<p><a href="javascript:alert(1)">x</a></p>','<img token="private"/>','<sheet token="private"/>'])assert.throws(()=>bodyToMarkdown(entry,partsFromXml(xml(body)),manifest));
});
test('飞书元信息驱动标题、署名、时效和编辑按钮，不能伪造核对日期',()=>{
 const parts=partsFromXml(xml('<p>内容</p>'));parts.metadata['作者']='甲、乙';parts.metadata['最近人工核对']='2026-10-01';
 const fm=frontmatterFromDocument(entry,parts,4,'1793152800');
 assert.deepEqual(fm.authors,['甲','乙']);assert.equal(fm.title,'新题');assert.equal(fm.editUrl,entry.url);assert.equal(fm.banner.content,'<b>原提示</b>');assert(fm.lastUpdated instanceof Date);
 parts.metadata['最近人工核对']='2099-01-01';assert.throws(()=>frontmatterFromDocument(entry,parts,4,'1793152800'),/核对日期/);
 parts.metadata['最近人工核对']='未标注';parts.metadata['适用阶段']='虚构阶段';assert.throws(()=>frontmatterFromDocument(entry,parts,4,'1793152800'),/适用阶段/);
});
test('首页副标题中的 HTML 作为文字显示',()=>{
 const parts=partsFromXml(xml('<p>内容</p>'));parts.metadata['首页副标题']='<img src=x onerror=alert(1)>';
 const fm=frontmatterFromDocument({...entry,frontmatter:{...entry.frontmatter,hero:{tagline:'原副标题'}}},parts,4,'1793152800');
 assert.equal(fm.hero.tagline,'&lt;img src=x onerror=alert(1)&gt;');
});
test('Starlight 标题包装后仍能还原可搜索的链接分组',()=>{
 const html='<div class="sl-heading-wrapper level-h2"><h2>图书馆</h2></div><ul><li><a href="https://example.com">入口</a>说明</li></ul>';
 const dom=documentOf(enhanceLinkDirectory(html));
 assert.equal(nodes(dom,'[data-link-section]').length,1);assert.equal(nodes(dom,'[data-link-card]').length,1);
 assert(dom.body.textContent.includes('入口说明'));
});
test('首页推荐表还原卡片，正文中的标题与说明仍由飞书提供',()=>{
 const html='<p>提问提示</p><div data-feishu-component="AskBox"></div><table><tr><th>栏目</th><th>入口</th><th>说明</th></tr><tr><td>新生</td><td><a href="/freshman/">报到</a></td><td>携带证件</td></tr></table><div class="level-h3"><h3>学业</h3></div><p><a href="/academics/">学习方法</a>每天复习</p>';
 const dom=documentOf(enhanceHomeContent(html));
 assert.equal(dom.querySelector('.home-featured__title').textContent,'报到');assert.equal(dom.querySelector('.home-featured__desc').textContent,'携带证件');
 assert(dom.querySelector('.home-ask [data-feishu-component]'));assert.equal(nodes(dom,'.feishu-home-card').length,1);
});
