import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html','r',encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
total = len(lines)

# 找 PROTO_META
pm_idx = content.find('PROTO_META')
if pm_idx != -1:
    block = content[pm_idx:pm_idx+1500]
    # 找所有协议 key
    keys = re.findall(r"(\w+)\s*:\s*\{", block)
    print(f'PROTO_META 协议列表: {keys}')
    print()

# 找 protocolDB
pdb_idx = content.find('protocolDB')
print(f'protocolDB 首次出现 L{content[:pdb_idx].count(chr(10))+1}')

# 找懒加载的 data/*.js 文件引用
script_loads = re.findall(r"'data/([^']+\.js)'", content)
print(f'动态加载的 data/*.js: {sorted(set(script_loads))}')

# 统计各区块行数
css_lines = content[content.find('<style'):content.find('</style')].count('\n')
html_start = content.find('<body')
html_end   = content.find('<script', html_start)
html_lines = content[html_start:html_end].count('\n')
js_lines   = total - css_lines - html_lines
print()
print(f'CSS:  {css_lines} 行  ({css_lines*100//total}%)')
print(f'HTML: {html_lines} 行  ({html_lines*100//total}%)')
print(f'JS:   {js_lines} 行  ({js_lines*100//total}%) [估算]')
print(f'总计: {total} 行')

# 分析 CSS 组成
selectors = re.findall(r'\n([.#\w][^{]+)\{', content[:content.find('</style')])
print(f'\nCSS 规则数 (估): {len(selectors)}')

# 分析动画 keyframes
keyframes = re.findall(r'@keyframes\s+(\w+)', content)
print(f'@keyframes 数量: {len(keyframes)} → {keyframes}')

# 分析 function 数量
funcs = re.findall(r'function\s+(\w+)\s*\(', content)
print(f'\nJS function 数量: {len(funcs)}')
for fn in funcs:
    print(f'  {fn}')
