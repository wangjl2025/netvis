#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""最终确认问题清单"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

print("="*60)
print("O. 所有画布 id 是否都在 HTML 中定义")
print("="*60)
canvas_ids = ['tcpDiagram','udpDiagram','tcp4Diagram','httpDiagram','tlsDiagram','dnsCanvas','genericDiagram']
for id_ in canvas_ids:
    has = f'id="{id_}"' in html
    print(f"  {'✅' if has else '❌'} id=\"{id_}\"")

print()
print("="*60)
print("P. L3231 canvases vs L3266 的对比（是否遗漏 udpDiagram）")
print("="*60)
# 找 L3231
for m in re.finditer(r"const canvases\s*=\s*\[([^\]]+)\]", html):
    lineno = html[:m.start()].count('\n') + 1
    print(f"  L{lineno} canvases: {m.group(1).strip()}")
# 找 L3266
for m in re.finditer(r"\['tcpDiagram'[^\]]+\]\.forEach", html):
    lineno = html[:m.start()].count('\n') + 1
    print(f"  L{lineno} forEach: {m.group(0)[:120]}")

print()
print("="*60)
print("Q. knowledge 字段在各协议中的数量和索引对应关系")
print("="*60)
for proto in ['arp','dhcp','dns','http','icmp','smtp','ssh','tcp4','tls','udp','websocket']:
    fpath = os.path.join(BASE,'data',f'{proto}.js')
    with open(fpath,'r',encoding='utf-8') as f:
        js = f.read()
    # 统计 knowledge 数组长度
    m = re.search(r'knowledge\s*:\s*\[', js)
    if m:
        start = m.end(); depth = 1; pos = start
        while pos < len(js) and depth > 0:
            if js[pos] == '[': depth += 1
            elif js[pos] == ']': depth -= 1
            pos += 1
        block = js[start:pos-1]
        count = 0; d = 0; i = 0
        while i < len(block):
            if block[i] == '{':
                if d == 0: count += 1
                d += 1
            elif block[i] == '}': d -= 1
            i += 1
        # 也找 steps 数量
        m2 = re.search(r'steps\s*:\s*\[', js)
        steps_count = '?'
        if m2:
            s2 = m2.end(); d2 = 1; p2 = s2
            while p2 < len(js) and d2 > 0:
                if js[p2] == '[': d2 += 1
                elif js[p2] == ']': d2 -= 1
                p2 += 1
            steps_block = js[s2:p2-1]
            steps_count = len(re.findall(r'^\s*\{', steps_block, re.MULTILINE))
        match_str = '✅' if count == steps_count else f'⚠️ ({steps_count}步但{count}个知识点)'
        print(f"  {proto}: knowledge={count}, steps={steps_count} {match_str}")
    else:
        print(f"  {proto}: ❌ 没有 knowledge 字段")

print()
print("="*60)
print("R. 检查 PROTO_META 中 abnormal 数据的协议（对照 abnormalBtn 逻辑）")
print("="*60)
# 找 PROTO_META 里有 abnormal 的协议
for m in re.finditer(r"(\w+)\s*:\s*\{[^{}]*abnormal\s*:", html):
    lineno = html[:m.start()].count('\n') + 1
    print(f"  L{lineno}: 协议 '{m.group(1)}' 有 abnormal 数据")

print()
print("="*60)
print("S. renderStep 中 conn-banner 的查询是否安全")
print("="*60)
for m in re.finditer(r'conn-banner', html):
    lineno = html[:m.start()].count('\n') + 1
    s = html.rfind('\n', 0, m.start()) + 1
    e = html.find('\n', m.end())
    print(f"  L{lineno}: {html[s:e].strip()[:100]}")

print()
print("="*60)
print("T. 检查所有 .proto-tab 的 onclick 中的协议名是否都有 PROTO_META 和 data 对应")
print("="*60)
proto_tab_ids = re.findall(r"proto-tab[^'\"]*onclick=\"switchProtocol\('([^']+)'", html)
proto_tab_ids += re.findall(r'proto-tab[^\'\"]*onclick="[^"]*\'([a-z0-9]+)\'"', html)
# 更准确的方式：找所有 class="proto-tab" 的 onclick
tabs = re.findall(r'class="proto-tab[^"]*"[^>]*onclick="[^"]*\'([a-z0-9]+)\'', html)
tabs += re.findall(r"class='proto-tab[^']*'[^>]*onclick='[^']*'([a-z0-9]+)'", html)
print(f"  找到 proto-tab 协议: {list(set(tabs))}")

# 从 HTML 找 proto-tab 的完整列表
tab_lines = [line.strip() for line in html.split('\n') if 'proto-tab' in line and 'onclick' in line]
print(f"  proto-tab 行数: {len(tab_lines)}")
for line in tab_lines[:15]:
    print(f"    {line[:100]}")
