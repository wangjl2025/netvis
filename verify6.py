#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查 dhcp/udp 多余的 knowledge 条目"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

for proto in ['dhcp','udp']:
    fpath = os.path.join(BASE,'data',f'{proto}.js')
    with open(fpath,'r',encoding='utf-8') as f:
        js = f.read()

    # 找 knowledge 数组，打印每个条目的 title 和 index
    m = re.search(r'knowledge\s*:\s*\[', js)
    if m:
        s = m.end(); d = 1; p = s
        while p < len(js) and d > 0:
            if js[p] == '[': d += 1
            elif js[p] == ']': d -= 1
            p += 1
        block = js[s:p-1]

        # 解析每个条目
        items = []
        i = 0; dd = 0; start_i = -1
        while i < len(block):
            if block[i] == '{':
                if dd == 0: start_i = i
                dd += 1
            elif block[i] == '}':
                dd -= 1
                if dd == 0 and start_i >= 0:
                    items.append(block[start_i:i+1])
                    start_i = -1
            i += 1

        print(f"\n=== {proto}.js: {len(items)} 个 knowledge 条目 ===")
        for idx_k, item in enumerate(items):
            # 提取 title
            t = re.search(r'title\s*:\s*[\'"]([^\'"]{0,60})', item)
            print(f"  [{idx_k}] {t.group(1) if t else item[:60].strip()!r}")
    
    # 同时打印 steps 数量
    m2 = re.search(r'steps\s*:\s*\[', js)
    steps_n = 0
    if m2:
        s = m2.end(); d = 1; p = s
        while p < len(js) and d > 0:
            if js[p] == '[': d += 1
            elif js[p] == ']': d -= 1
            p += 1
        block = js[s:p-1]
        for line in block.split('\n'):
            if re.match(r'\s*\{\s*title', line):
                steps_n += 1
    print(f"  steps 数量: {steps_n} → 第 {steps_n} 步对应 knowledge[{steps_n-1}]，knowledge[{steps_n}] 多余")
