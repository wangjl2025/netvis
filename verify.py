#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""精准验证 5 个疑似问题"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

print("="*60)
print("1. tcp3Diagram / step-dots / proto-nav / proto-tabs 是否真的缺失？")
print("="*60)
# 搜索各种形式（不只是 id="xxx"）
for key in ['tcp3Diagram','step-dots','proto-nav','proto-tabs']:
    count_id = html.count(f'id="{key}"')
    count_query = html.count(f'getElementById("{key}")')
    count_query2 = html.count(f"getElementById('{key}')")
    count_query3 = html.count(f'querySelector("#{key}")')
    count_query4 = html.count(f"querySelector('#{key}')")
    count_class = html.count(f'class="{key}"')
    count_any = html.count(key)
    print(f"\n  [{key}]")
    print(f"    id=\"{key}\": {count_id}")
    print(f"    getElementById: {count_query + count_query2}")
    print(f"    querySelector: {count_query3 + count_query4}")
    print(f"    class=\"{key}\": {count_class}")
    print(f"    全文总出现次数: {count_any}")
    if count_any > 0:
        # 打印所有出现位置（前3个）
        for i, m in enumerate(re.finditer(re.escape(key), html)):
            if i >= 5: break
            lineno = html[:m.start()].count('\n') + 1
            start = html.rfind('\n', 0, m.start()) + 1
            end = html.find('\n', m.end())
            print(f"    L{lineno}: {html[start:end].strip()[:100]}")

print()
print("="*60)
print("2. PROTO_META 实际格式")
print("="*60)
# 找 PROTO_META 真实定义
m = re.search(r'PROTO_META\s*=\s*\{', html)
if m:
    start = m.end()
    depth = 1; pos = start
    while pos < len(html) and depth > 0:
        if html[pos] == '{': depth += 1
        elif html[pos] == '}': depth -= 1
        pos += 1
    block = html[start:pos-1]
    print(f"  PROTO_META 块大小: {len(block)} chars")
    # 找所有 key:
    keys = re.findall(r"(\w+)\s*:\s*\{", block)
    print(f"  找到的 key: {keys[:20]}")
else:
    print("  未找到 PROTO_META 定义（可能是其他变量名）")
    # 尝试寻找协议配置对象
    for name in ['PROTO_META','protoMeta','proto_meta','PROTOCOLS','protocols']:
        if name in html:
            print(f"  发现 {name}")

print()
print("="*60)
print("3. data/*.js 懒加载机制：实际用什么 key？")
print("="*60)
# 查看 loadProtocol / dynamic import 逻辑
for keyword in ['loadProtocol','dynamicLoad','import(','script.src','window[']:
    cnt = html.count(keyword)
    if cnt:
        print(f"\n  '{keyword}' 出现 {cnt} 次，示例：")
        for i, m in enumerate(re.finditer(re.escape(keyword), html)):
            if i >= 2: break
            lineno = html[:m.start()].count('\n') + 1
            start = html.rfind('\n', 0, m.start()) + 1
            end = html.find('\n', m.end())
            print(f"    L{lineno}: {html[start:end].strip()[:100]}")

print()
print("="*60)
print("4. rebuildStepData 函数完整内容（后200字符）")
print("="*60)
idx = html.find('function rebuildStepData')
if idx >= 0:
    # 找函数结束
    brace_depth = 0
    found_start = False
    pos = idx
    while pos < len(html):
        if html[pos] == '{':
            brace_depth += 1
            found_start = True
        elif html[pos] == '}':
            brace_depth -= 1
            if found_start and brace_depth == 0:
                break
        pos += 1
    fn_body = html[idx:pos+1]
    print(f"  函数长度: {len(fn_body)} chars")
    # 检查 protocolDB['tcp3'] 赋值
    if "protocolDB['tcp3']" in fn_body or 'protocolDB["tcp3"]' in fn_body:
        print("  ✅ 函数内有 protocolDB['tcp3'] 赋值")
        # 找赋值位置
        for m in re.finditer(r"protocolDB\[.tcp3.\]", fn_body):
            lno = fn_body[:m.start()].count('\n')
            start = fn_body.rfind('\n', 0, m.start()) + 1
            end = fn_body.find('\n', m.end())
            print(f"    行{lno}: {fn_body[start:end].strip()[:100]}")
    else:
        print("  ❌ 函数内没有 protocolDB['tcp3'] 赋值")
    # 打印函数最后200字符
    print("  函数末尾 200 chars:")
    print("  " + fn_body[-200:].replace('\n','\n  '))
else:
    print("  未找到 rebuildStepData 函数")

print()
print("="*60)
print("5. data/*.js 实际使用的 window 赋值方式")
print("="*60)
# 看一个文件的完整开头
sample = os.path.join(BASE,'data','tcp4.js')
with open(sample,'r',encoding='utf-8') as f:
    tcp4 = f.read()
print("  tcp4.js 前5行:")
for i, line in enumerate(tcp4.split('\n')[:5]):
    print(f"    {line[:100]}")
print("  tcp4.js 后5行:")
for line in tcp4.split('\n')[-5:]:
    print(f"    {line[:100]}")
