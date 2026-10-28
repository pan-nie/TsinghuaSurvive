#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Retained for a future Feishu preview/site. Production now uses Git content.
const value=flag=>{const i=process.argv.indexOf(flag);return i===-1?undefined:process.argv[i+1];};
const siteOrigin=value('--base'),stateFile=value('--state');
if(!siteOrigin||!stateFile)throw Error('仅用于飞书预览站：请显式指定 --base <地址> --state <导出版本文件>；正式网站不再同步飞书');
const expected=JSON.parse(await fs.readFile(stateFile,'utf8'));
const response=await fetch(siteOrigin+'/content-version.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,'线上没有飞书版本记录');
const actual=await response.json();
assert.deepEqual(actual.documents,expected.documents,'线上内容版本与本次同步不一致');
console.log('线上飞书版本一致：'+Object.keys(expected.documents).length+' 篇');
