import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html','r',encoding='utf-8') as f:
    content = f.read()

# 动态加载：找 createElement('script') 模式
dyn_scripts = re.findall(r"createElement\(['\"]script['\"]", content)
print(f"createElement('script') 调用次数: {len(dyn_scripts)}")

# 找 src = 赋值，相邻行
for m in re.finditer(r"\.src\s*=\s*['\"]([^'\"]+)['\"]", content):
    lineno = content[:m.start()].count('\n') + 1
    print(f'  L{lineno}: .src = {m.group(1)}')

# PROTO_META 完整内容
pm_start = content.find('const PROTO_META')
if pm_start == -1:
    pm_start = content.find('PROTO_META =')
    if pm_start == -1:
        pm_start = content.find('PROTO_META')
print(f'\nPROTO_META 位置: L{content[:pm_start].count(chr(10))+1}')
print(content[pm_start:pm_start+200])

# protocolDB 赋值
for m in re.finditer(r"protocolDB\['(\w+)'\]\s*=", content):
    lineno = content[:m.start()].count('\n') + 1
    print(f'  protocolDB[\'{m.group(1)}\'] = ... (L{lineno})')
