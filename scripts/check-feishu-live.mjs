#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { siteOrigin } from './site-config.mjs';
const expected=JSON.parse(await fs.readFile(new URL('../src/data/feishu-state.json',import.meta.url),'utf8'));
const response=await fetch(siteOrigin+'/content-version.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,'线上没有飞书版本记录');
const actual=await response.json();
assert.deepEqual(actual.documents,expected.documents,'线上内容版本与本次同步不一致');
console.log('线上飞书版本一致：'+Object.keys(expected.documents).length+' 篇');
