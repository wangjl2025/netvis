#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全面代码审查脚本"""
import sys, re, os, json

sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

issues = []
def issue(level, msg):
    issues.append((level, msg))
    prefix = {'ERROR':'❌','WARN':'⚠️','INFO':'ℹ️'}.get(level,'?')
    print(f'{prefix} [{level}] {msg}')

# ─────────────────────────────────────────────
# 1. 读取 index.html
# ─────────────────────────────────────────────
html_path = os.path.join(BASE, 'index.html')
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
html_lines = html.split('\n')
print(f'\n=== index.html: {len(html_lines)} 行, {len(html.encode())//1024} KB ===\n')

# 关键 DOM id 检查（每个应恰好出现一次）
critical_ids = [
    'steps-list','tab-steps','knowledgeBlock','quizBlock',
    'customSeqPanel','compareToggleBtn','genericDiagram','tcp3Diagram',
    'step-dots','proto-nav','proto-tabs'
]
print('--- DOM id 完整性 ---')
for id_ in critical_ids:
    cnt = html.count(f'id="{id_}"')
    if cnt == 0:
        issue('ERROR', f'id="{id_}" 未在 HTML 中定义')
    elif cnt > 1:
        issue('WARN', f'id="{id_}" 定义了 {cnt} 次（重复）')
    else:
        print(f'  ✓ id="{id_}" 出现 1 次')

# ─────────────────────────────────────────────
# 2. 提取 PROTO_META 和 protocolDB 的协议列表
# ─────────────────────────────────────────────
print('\n--- PROTO_META 协议列表 ---')
meta_protos = re.findall(r"'([a-z0-9]+)'\s*:\s*\{[^}]*label\s*:", html)
print(f'  从 PROTO_META 找到协议: {meta_protos}')

# protocolDB 里的 key
db_keys = re.findall(r"protocolDB\['([a-z0-9]+)'\]\s*=", html)
print(f'  protocolDB 赋值 key: {db_keys}')

# data/ 目录下的 js 文件
data_files = sorted([f.replace('.js','') for f in os.listdir(os.path.join(BASE,'data')) if f.endswith('.js')])
print(f'  data/*.js 文件: {data_files}')

# 检查 PROTO_META 里是否有 data/*.js 对应
print('\n--- PROTO_META 和 data 文件对比 ---')
for p in data_files:
    if p not in meta_protos:
        issue('WARN', f'data/{p}.js 存在，但 PROTO_META 里找不到对应的 {p!r}')

# ─────────────────────────────────────────────
# 3. 检查每个 data/*.js 文件的内容完整性
# ─────────────────────────────────────────────
print('\n--- data/*.js 内容完整性 ---')
PROTO_EXPECTED = {
    'tcp4': {'steps': 4, 'stepData': 4, 'quiz': 4},
    'http': {'steps': 5, 'stepData': 5, 'quiz': 5},
    'tls':  {'steps': 4, 'stepData': 4, 'quiz': 4},
    'dns':  {'steps': 8, 'stepData': 8, 'quiz': 5},
    'udp':  {'steps': 4, 'stepData': 4, 'quiz': 4},
    'arp':  {'steps': 5, 'stepData': 5, 'quiz': 5},
    'icmp': {'steps': 5, 'stepData': 5, 'quiz': 5},
    'dhcp': {'steps': 4, 'stepData': 4, 'quiz': 4},
    'smtp': {'steps': 6, 'stepData': 6, 'quiz': 4},
    'websocket': {'steps': 5, 'stepData': 5, 'quiz': 4},
    'ssh':  {'steps': 6, 'stepData': 6, 'quiz': 4},
}

for proto, expects in PROTO_EXPECTED.items():
    fpath = os.path.join(BASE, 'data', f'{proto}.js')
    if not os.path.exists(fpath):
        issue('ERROR', f'data/{proto}.js 文件不存在！')
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        js = f.read()

    # 检查必要字段
    has_steps = bool(re.search(r'steps\s*:', js))
    has_stepData = bool(re.search(r'stepData\s*:', js))
    has_quiz = bool(re.search(r'quiz\s*:', js))
    has_knowledge = bool(re.search(r'knowledge\s*:', js))

    if not has_steps:
        issue('ERROR', f'{proto}.js 缺少 steps 字段')
    if not has_stepData:
        issue('ERROR', f'{proto}.js 缺少 stepData 字段')
    if not has_quiz:
        issue('WARN', f'{proto}.js 缺少 quiz 字段')
    if not has_knowledge:
        issue('WARN', f'{proto}.js 缺少 knowledge 字段')

    # 用正则统计 steps 中顶层 { 的个数（仅统计开头行）
    # 方法：找到 steps: [ ... ] 块，计算一级 { 数
    m = re.search(r'steps\s*:\s*\[', js)
    if m:
        # 从 [ 开始数括号深度找到对应 ]
        start = m.end()
        depth = 1
        pos = start
        while pos < len(js) and depth > 0:
            if js[pos] == '[': depth += 1
            elif js[pos] == ']': depth -= 1
            pos += 1
        steps_block = js[start:pos-1]
        steps_count = len(re.findall(r'^\s*\{', steps_block, re.MULTILINE))
        expected_s = expects['steps']
        if steps_count != expected_s:
            issue('WARN', f'{proto}.js steps 数量: {steps_count}（预期 {expected_s}）')
        else:
            print(f'  ✓ {proto}.js steps: {steps_count}')

    # 统计 stepData 中顶层 { 数
    m2 = re.search(r'stepData\s*:\s*\[', js)
    if m2:
        start = m2.end()
        depth = 1
        pos = start
        while pos < len(js) and depth > 0:
            if js[pos] == '[': depth += 1
            elif js[pos] == ']': depth -= 1
            pos += 1
        sd_block = js[start:pos-1]
        sd_count = len(re.findall(r'^\s*\{', sd_block, re.MULTILINE))
        expected_sd = expects['stepData']
        # stepData 块内有嵌套 { (fields)，只数第一层
        # 用深度计数法
        real_count = 0
        i = 0
        d = 0
        while i < len(sd_block):
            if sd_block[i] == '{':
                if d == 0:
                    real_count += 1
                d += 1
            elif sd_block[i] == '}':
                d -= 1
            i += 1
        if real_count != expected_sd:
            issue('WARN', f'{proto}.js stepData 顶层对象数量: {real_count}（预期 {expected_sd}）')
        else:
            print(f'  ✓ {proto}.js stepData: {real_count}')

    # 统计 quiz 数组
    m3 = re.search(r'quiz\s*:\s*\[', js)
    if m3:
        start = m3.end()
        depth = 1
        pos = start
        while pos < len(js) and depth > 0:
            if js[pos] == '[': depth += 1
            elif js[pos] == ']': depth -= 1
            pos += 1
        quiz_block = js[start:pos-1]
        real_count = 0
        i = 0
        d = 0
        while i < len(quiz_block):
            if quiz_block[i] == '{':
                if d == 0:
                    real_count += 1
                d += 1
            elif quiz_block[i] == '}':
                d -= 1
            i += 1
        expected_q = expects['quiz']
        if real_count != expected_q:
            issue('WARN', f'{proto}.js quiz 数量: {real_count}（预期 {expected_q}）')
        else:
            print(f'  ✓ {proto}.js quiz: {real_count}')

    # 检查是否有 window['proto_xxx'] = 赋值
    assign_key = f"window['proto_{proto}']"
    assign_key2 = f'window["proto_{proto}"]'
    if assign_key not in js and assign_key2 not in js:
        issue('WARN', f'{proto}.js 没有 window["proto_{proto}"] 赋值（懒加载无法解析？）')
    else:
        print(f'  ✓ {proto}.js window 赋值正确')

# ─────────────────────────────────────────────
# 4. 检查 index.html 里的关键 JS 逻辑
# ─────────────────────────────────────────────
print('\n--- JS 逻辑关键检查 ---')

# switchProtocol 存在
if 'function switchProtocol' in html or 'switchProtocol' in html:
    print('  ✓ switchProtocol 函数存在')
else:
    issue('ERROR', 'switchProtocol 函数未找到')

# openProtocol 存在
if 'function openProtocol' in html or 'openProtocol' in html:
    print('  ✓ openProtocol 函数存在')
else:
    issue('ERROR', 'openProtocol 函数未找到')

# rebuildSidePanel 存在且指向 steps-list
if 'function rebuildSidePanel' in html:
    m = re.search(r'function rebuildSidePanel.*?(?=\nfunction |\nconst |\nlet |\n//)', html, re.DOTALL)
    if m:
        fn_body = m.group(0)
        if 'steps-list' in fn_body:
            print('  ✓ rebuildSidePanel 使用 #steps-list（不影响知识点块）')
        else:
            issue('ERROR', 'rebuildSidePanel 未使用 #steps-list，会破坏知识点块')
        if 'tab-steps' in fn_body and 'innerHTML' in fn_body:
            issue('WARN', 'rebuildSidePanel 仍在清空 #tab-steps（可能误删知识点块）')
else:
    issue('ERROR', 'rebuildSidePanel 函数未找到')

# renderStep 存在且指向 steps-list
if 'function renderStep' in html:
    m = re.search(r'function renderStep.*?(?=\nfunction |\nconst |\nlet )', html, re.DOTALL)
    if m:
        fn_body = m.group(0)
        if '#steps-list .step-card' in fn_body or "steps-list" in fn_body:
            print('  ✓ renderStep 使用 #steps-list .step-card')
        else:
            issue('WARN', 'renderStep 可能仍在使用旧的 #tab-steps .step-card 选择器')
else:
    issue('ERROR', 'renderStep 函数未找到')

# rebuildStepDots 存在
if 'function rebuildStepDots' in html or 'rebuildStepDots' in html:
    print('  ✓ rebuildStepDots 函数存在')
else:
    issue('ERROR', 'rebuildStepDots 函数未找到')

# tcp3 的 rebuildStepData
if 'rebuildStepData' in html:
    print('  ✓ rebuildStepData 函数存在')
    # 检查末尾是否有 protocolDB['tcp3'] 赋值
    m = re.search(r"rebuildStepData\s*\(.*?\}(?:\s*\n)+\s*protocolDB\['tcp3'\]", html, re.DOTALL)
    if m:
        print("  ✓ rebuildStepData 末尾有 protocolDB['tcp3'] 赋值")
    else:
        # 也检查函数体内
        idx = html.find('function rebuildStepData')
        if idx >= 0:
            snippet = html[idx:idx+2000]
            if "protocolDB['tcp3']" in snippet:
                print("  ✓ rebuildStepData 内部有 protocolDB['tcp3'] 赋值")
            else:
                issue('ERROR', "rebuildStepData 内没有 protocolDB['tcp3'] 赋值（tcp3 状态不会保存）")
else:
    issue('ERROR', 'rebuildStepData 函数未找到')

# tcp3 懒加载守卫
if "pid === 'tcp3'" in html or 'tcp3' in html:
    # 检查 openProtocol 里是否有 tcp3 跳过加载
    idx = html.find('function openProtocol')
    if idx >= 0:
        snippet = html[idx:idx+1500]
        if "tcp3" in snippet and ("return" in snippet or "skip" in snippet or "已加载" in snippet):
            print('  ✓ openProtocol 对 tcp3 有特殊处理')
        else:
            issue('WARN', 'openProtocol 里可能没有跳过 tcp3 的加载守卫')

# preloadAll 里是否排除 tcp3
idx = html.find('preloadAll')
if idx >= 0:
    snippet = html[idx:idx+500]
    if 'tcp3' in snippet:
        issue('WARN', 'preloadAll 列表里可能还包含 tcp3（会导致重复加载）')
    else:
        print('  ✓ preloadAll 已排除 tcp3')

# customSeqPanel 只在 tcp3 显示
if "pid === 'tcp3'" in html and 'customSeqPanel' in html:
    print("  ✓ customSeqPanel 有 tcp3 判断逻辑")
else:
    issue('WARN', "customSeqPanel 可能没有 tcp3 控制逻辑")

# ─────────────────────────────────────────────
# 5. 检查 JS 语法层面的明显错误（括号/引号不匹配）
# ─────────────────────────────────────────────
print('\n--- 括号平衡简单检查（index.html script 块）---')
# 提取所有 <script> 内容
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
combined_js = '\n'.join(scripts)
# 统计括号
open_brace = combined_js.count('{')
close_brace = combined_js.count('}')
open_paren = combined_js.count('(')
close_paren = combined_js.count(')')
open_bracket = combined_js.count('[')
close_bracket = combined_js.count(']')

for name, o, c in [('{}',open_brace,close_brace),('()',open_paren,close_paren),('[]',open_bracket,close_bracket)]:
    if o == c:
        print(f'  ✓ {name} 平衡 ({o}个)')
    else:
        issue('ERROR', f'{name} 不平衡：打开={o}, 关闭={c}, 差值={o-c}')

# ─────────────────────────────────────────────
# 6. data/*.js 括号检查
# ─────────────────────────────────────────────
print('\n--- data/*.js 括号平衡检查 ---')
for proto in data_files:
    fpath = os.path.join(BASE, 'data', f'{proto}.js')
    with open(fpath, 'r', encoding='utf-8') as f:
        js = f.read()
    o = js.count('{')
    c = js.count('}')
    if o != c:
        issue('ERROR', f'data/{proto}.js {{}} 不平衡：{o} vs {c}，差 {o-c}')
    else:
        print(f'  ✓ {proto}.js {{}} 平衡（{o}）')

# ─────────────────────────────────────────────
# 汇总
# ─────────────────────────────────────────────
print('\n' + '='*60)
errors = [i for i in issues if i[0]=='ERROR']
warns  = [i for i in issues if i[0]=='WARN']
print(f'检查完毕 — ❌ ERROR: {len(errors)}  ⚠️ WARN: {len(warns)}')
if errors:
    print('\n严重问题:')
    for _, m in errors:
        print(f'  ❌ {m}')
if warns:
    print('\n警告:')
    for _, m in warns:
        print(f'  ⚠️  {m}')
if not issues:
    print('✅ 未发现任何问题！')
