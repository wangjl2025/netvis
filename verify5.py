#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查 knowledge 超出 steps 或少于 steps 是否有功能影响"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

# renderStep 里的 knowledge 读取逻辑
print("renderStep 里 knowledge 读取方式:")
idx = html.find('db.knowledge')
if idx >= 0:
    lineno = html[:idx].count('\n') + 1
    s = html.rfind('\n', 0, idx) + 1
    e = html.find('\n', idx + 200)
    print("  " + html[s:e+100].strip()[:200])

print()
print("各协议 knowledge 数量详情（> steps 的情况）:")
for proto in ['dhcp','udp','smtp','ssh','dns']:
    fpath = os.path.join(BASE,'data',f'{proto}.js')
    with open(fpath,'r',encoding='utf-8') as f:
        js = f.read()

    # 精确统计 steps 
    m_steps = re.search(r'steps\s*:\s*\[', js)
    steps_count = 0
    if m_steps:
        s = m_steps.end(); d = 1; p = s
        while p < len(js) and d > 0:
            if js[p] == '[': d += 1
            elif js[p] == ']': d -= 1
            p += 1
        block = js[s:p-1]
        for line in block.split('\n'):
            if re.match(r'\s*\{\s*title', line):
                steps_count += 1

    # 精确统计 knowledge
    m_k = re.search(r'knowledge\s*:\s*\[', js)
    k_count = 0
    if m_k:
        s = m_k.end(); d = 1; p = s
        while p < len(js) and d > 0:
            if js[p] == '[': d += 1
            elif js[p] == ']': d -= 1
            p += 1
        block = js[s:p-1]
        real_count = 0; i = 0; dd = 0
        while i < len(block):
            if block[i] == '{':
                if dd == 0: real_count += 1
                dd += 1
            elif block[i] == '}': dd -= 1
            i += 1
        k_count = real_count

    # 精确统计 quiz
    m_q = re.search(r'quiz\s*:\s*\[', js)
    q_count = 0
    if m_q:
        s = m_q.end(); d = 1; p = s
        while p < len(js) and d > 0:
            if js[p] == '[': d += 1
            elif js[p] == ']': d -= 1
            p += 1
        block = js[s:p-1]
        real_count = 0; i = 0; dd = 0
        while i < len(block):
            if block[i] == '{':
                if dd == 0: real_count += 1
                dd += 1
            elif block[i] == '}': dd -= 1
            i += 1
        q_count = real_count

    print(f"\n  {proto}: steps={steps_count}, knowledge={k_count}, quiz={q_count}")
    # renderStep 的逻辑是：db.knowledge[currentStep-1] 为空则隐藏，不会报错
    # 所以 knowledge < steps 是正常的（末尾步骤不显示知识点）
    # 但 knowledge > steps 或 quiz > steps 意味着最后几条数据永远不会被读到
    if k_count > steps_count:
        print(f"  ⚠️  knowledge 多 {k_count - steps_count} 条，末尾 {k_count - steps_count} 条永远用不到")
    if q_count > steps_count:
        print(f"  ⚠️  quiz 多 {q_count - steps_count} 条，末尾 {q_count - steps_count} 条永远用不到")
    if k_count < steps_count:
        print(f"  ℹ️  knowledge 少 {steps_count - k_count} 条（末尾 {steps_count - k_count} 步无知识点，会自动隐藏，正常）")

print()
print("="*60)
print("U. udpDiagram 在 switchProtocol 里是否会被正确隐藏（查 L3266 那行）")
print("="*60)
# 找两处隐藏画布的代码
for m in re.finditer(r'\[.tcpDiagram[^\]]+\]', html):
    lineno = html[:m.start()].count('\n') + 1
    print(f"  L{lineno}: {m.group(0)[:120]}")
print()
# 找 L3231 那行（第一个 canvases 列表）
for m in re.finditer(r'const canvases', html):
    lineno = html[:m.start()].count('\n') + 1
    s = html.rfind('\n', 0, m.start()) + 1
    e = html.find(';', m.end())
    print(f"  L{lineno}: {html[s:e+1].strip()[:120]}")
