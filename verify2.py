#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""深入核查真实问题"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

print("="*60)
print("A. step-dots: 用 querySelector('.step-dots') 但 HTML 里叫什么？")
print("="*60)
# 找 step-dots 相关的类
for m in re.finditer(r'step.dots|progress.step|dot-step', html, re.IGNORECASE):
    lineno = html[:m.start()].count('\n') + 1
    start = html.rfind('\n', 0, m.start()) + 1
    end = html.find('\n', m.end())
    print(f"  L{lineno}: {html[start:end].strip()[:100]}")

print()
print("="*60)
print("B. progress-steps class 的实际位置")
print("="*60)
for m in re.finditer(r'progress-steps|step-dot', html):
    lineno = html[:m.start()].count('\n') + 1
    start = html.rfind('\n', 0, m.start()) + 1
    end = html.find('\n', m.end())
    print(f"  L{lineno}: {html[start:end].strip()[:100]}")

print()
print("="*60)
print("C. PROTO_META 里的 ssh 条目是否有？")
print("="*60)
idx = html.find('PROTO_META')
if idx >= 0:
    # 找整个 PROTO_META 对象
    bstart = html.find('{', idx)
    depth = 1; pos = bstart + 1
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    block = html[bstart:pos]
    if 'ssh' in block:
        print("  ✅ PROTO_META 包含 ssh")
        # 找 ssh 条目
        m = re.search(r"ssh\s*:\s*\{", block)
        if m:
            print("  ssh 条目内容（前200字符）：")
            print("  " + block[m.start():m.start()+200])
    else:
        print("  ❌ PROTO_META 不含 ssh")

print()
print("="*60)
print("D. 懒加载函数 loadProtocolData 的完整逻辑")
print("="*60)
idx = html.find('function loadProtocolData')
if idx < 0:
    idx = html.find('loadProtocolData')
    print(f"  找到 loadProtocolData 引用 at L{html[:idx].count(chr(10))+1}")
    # 找函数定义
    for name in ['async function loadProtocolData', 'const loadProtocolData', 'loadProtocolData =', 'loadProtocolData=']:
        if name in html:
            idx2 = html.find(name)
            lineno = html[:idx2].count('\n') + 1
            print(f"  定义方式: '{name}' at L{lineno}")
            # 打印该函数前300字符
            print("  " + html[idx2:idx2+400].replace('\n','\n  '))
            break
else:
    lineno = html[:idx].count('\n') + 1
    print(f"  function loadProtocolData at L{lineno}")
    bstart = html.find('{', idx)
    depth = 1; pos = bstart + 1
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    fn = html[idx:pos]
    print(f"  函数长度: {len(fn)} chars")
    print("  完整函数内容:")
    print("  " + fn[:600].replace('\n','\n  '))

print()
print("="*60)
print("E. 页面初始化链路：DOMContentLoaded 里调用了哪些函数？")
print("="*60)
m = re.search(r'DOMContentLoaded.*?\}\s*\)', html, re.DOTALL)
if m:
    block = m.group(0)
    print(f"  DOMContentLoaded 块大小: {len(block)} chars")
    # 找所有函数调用
    calls = re.findall(r'(\w+)\s*\(', block)
    # 去重并过滤
    seen = set()
    unique_calls = []
    for c in calls:
        if c not in seen and c not in ('if','for','while','function','return','switch','case'):
            seen.add(c)
            unique_calls.append(c)
    print(f"  调用的函数: {unique_calls}")
else:
    print("  未找到 DOMContentLoaded 块")

print()
print("="*60)
print("F. 检查 renderStep 函数里 knowledgeBlock 引用方式")
print("="*60)
idx = html.find('function renderStep')
if idx >= 0:
    bstart = html.find('{', idx)
    depth = 1; pos = bstart + 1
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    fn = html[idx:pos]
    # 找 knowledgeBlock 和 quizBlock 的操作
    for key in ['knowledgeBlock','quizBlock']:
        for m2 in re.finditer(key, fn):
            lno = fn[:m2.start()].count('\n') + 1
            start = fn.rfind('\n', 0, m2.start()) + 1
            end = fn.find('\n', m2.end())
            print(f"  {key} L{lno}: {fn[start:end].strip()[:100]}")

print()
print("="*60)
print("G. switchProtocol 函数的完整逻辑")
print("="*60)
idx = html.find('function switchProtocol')
if idx >= 0:
    lineno = html[:idx].count('\n') + 1
    bstart = html.find('{', idx)
    depth = 1; pos = bstart + 1
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    fn = html[idx:pos]
    print(f"  at L{lineno}, 长度: {len(fn)} chars")
    print("  " + fn.replace('\n','\n  '))
