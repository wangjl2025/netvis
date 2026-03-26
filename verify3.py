#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查第三批关键问题"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

print("="*60)
print("H. toggleCompare 引用的 tcpDiagram / udpDiagram 是否存在")
print("="*60)
for id_ in ['tcpDiagram','udpDiagram']:
    count_def = html.count(f'id="{id_}"')
    count_use = html.count(f'getElementById("{id_}")')
    count_any = html.count(id_)
    print(f"  {id_}: 定义={count_def}, getElementById={count_use}, 总出现={count_any}")
    if count_any > 0 and count_any <= 6:
        for m in re.finditer(re.escape(id_), html):
            lineno = html[:m.start()].count('\n') + 1
            s = html.rfind('\n', 0, m.start()) + 1
            e = html.find('\n', m.end())
            print(f"    L{lineno}: {html[s:e].strip()[:100]}")

print()
print("="*60)
print("I. openProtocol 函数完整内容")
print("="*60)
idx = html.find('function openProtocol')
if idx >= 0:
    lineno = html[:idx].count('\n') + 1
    bstart = html.find('{', idx)
    depth = 1; pos = bstart + 1
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    fn = html[idx:pos]
    print(f"  at L{lineno}")
    print("  " + fn.replace('\n','\n  '))

print()
print("="*60)
print("J. switchProtocol 函数完整内容")
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
    print(f"  at L{lineno}, 长度 {len(fn)}")
    print("  " + fn.replace('\n','\n  '))

print()
print("="*60)
print("K. preloadAll 函数内容")
print("="*60)
for name in ['preloadAll','preload_all','function preload']:
    idx = html.find(name)
    if idx >= 0:
        lineno = html[:idx].count('\n') + 1
        print(f"  '{name}' at L{lineno}")
        s = html.rfind('\n', 0, idx) + 1
        e_pos = idx + 600
        print("  " + html[s:e_pos].replace('\n','\n  '))
        break

print()
print("="*60)
print("L. 检查所有 getElementById 调用，找 HTML 中不存在的 id")
print("="*60)
# 提取所有 getElementById('xxx') 和 getElementById("xxx") 的 id
used_ids = set(re.findall(r'getElementById\([\'"]([^\'"]+)[\'"]\)', html))
# 提取所有 id="xxx" 定义
defined_ids = set(re.findall(r'id="([^"]+)"', html))
missing = used_ids - defined_ids
if missing:
    print(f"  ❌ 以下 id 被 getElementById 引用但未在 HTML 定义:")
    for mid in sorted(missing):
        count = html.count(f'getElementById("{mid}")') + html.count(f"getElementById('{mid}')")
        print(f"    '{mid}' (引用 {count} 次)")
        # 显示引用位置
        for m in re.finditer(f'getElementById.["\']' + re.escape(mid), html):
            lineno = html[:m.start()].count('\n') + 1
            s = html.rfind('\n', 0, m.start()) + 1
            e = html.find('\n', m.end())
            print(f"      L{lineno}: {html[s:e].strip()[:90]}")
else:
    print("  ✅ 所有 getElementById 引用的 id 都存在于 HTML 中")

print()
print("="*60)
print("M. 检查所有 querySelector 调用，找可能不存在的选择器")
print("="*60)
qs_calls = re.findall(r'querySelector\([\'"]([^\'"]+)[\'"]\)', html)
# 只检查 id 选择器
for sel in set(qs_calls):
    if sel.startswith('#'):
        id_name = sel[1:]
        if f'id="{id_name}"' not in html:
            cnt = html.count(f'querySelector("{sel}")') + html.count(f"querySelector('{sel}')")
            print(f"  ⚠️  querySelector('{sel}') 引用的 id={id_name} 不存在 ({cnt}次)")
    elif sel.startswith('.'):
        cls_name = sel[1:]
        if f'class="{cls_name}"' not in html and f' {cls_name} ' not in html and f'class="{cls_name} ' not in html:
            cnt = html.count(f'querySelector("{sel}")') + html.count(f"querySelector('{sel}')")
            # 检查 CSS 里是否定义了该类
            if f'.{cls_name}' in html:
                pass # CSS里有定义，跳过
            else:
                print(f"  ⚠️  querySelector('{sel}') - class 可能不存在 ({cnt}次)")

print()
print("="*60)
print("N. data/*.js 文件中 quiz 是否用旧的 {q,a} HTML 格式（可能导致显示问题）")
print("="*60)
for proto in ['arp','dhcp','dns','http','icmp','smtp','ssh','tcp4','tls','udp','websocket']:
    fpath = os.path.join(BASE,'data',f'{proto}.js')
    with open(fpath,'r',encoding='utf-8') as f:
        js = f.read()
    # 检查 quiz 格式
    has_new = bool(re.search(r'options\s*:', js))
    has_old = bool(re.search(r'\ba\s*:', js) and re.search(r'\bq\s*:', js))
    has_answer = bool(re.search(r'\banswer\s*:', js))
    fmt = []
    if has_new and has_answer: fmt.append('新格式(options+answer)')
    if has_old and not has_new: fmt.append('旧格式(q+a)')
    if has_old and has_new: fmt.append('混合格式')
    print(f"  {proto}: {', '.join(fmt) if fmt else '未知'}")
