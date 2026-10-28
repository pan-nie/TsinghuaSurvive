#!/usr/bin/env node
// Credentials stay in the Actions secret environment and the CLI's protected credential store.
import { spawn } from 'node:child_process';
const {FEISHU_APP_ID, FEISHU_APP_SECRET} = process.env;
if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) throw Error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET；保留线上版本');
const child = spawn('lark-cli', ['config','init','--app-id',FEISHU_APP_ID,'--app-secret-stdin','--brand','feishu'], {stdio:['pipe','ignore','ignore']});
child.stdin.end(FEISHU_APP_SECRET + '\n');
child.on('error', () => { console.error('无法启动飞书 CLI'); process.exitCode=1; });
child.on('close', code => { if (code) { console.error('飞书 CLI 身份初始化失败'); process.exitCode=1; } });
