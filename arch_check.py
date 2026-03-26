import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html','r',encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
total = len(lines)
print(f'=== index.html 总行数: {total} ({os.path.getsize("index.html")//1024} KB)')
print()

# 找关键区块
landmarks = {
    '<style': 'CSS 开始',
    '</style': 'CSS 结束',
    '<body': 'HTML body 开始',
    'let activeProtocol': 'JS 全局变量',
    'function rebuildStepDots': 'JS rebuildStepDots',
    'function renderStep': 'JS renderStep',
    'function launchPacket': 'JS launchPacket',
    'DOMContentLoaded': 'JS 初始化',
    '</body': 'body 结束',
}
for kw, label in landmarks.items():
    m = re.search(re.escape(kw), content)
    if m:
        lineno = content[:m.start()].count('\n') + 1
        print(f'  L{lineno:4d}: {label}')

print()
# script 标签
scripts = re.findall(r'<script', content)
print(f'script 标签总数: {len(scripts)}')

# 外部依赖
ext_srcs = re.findall(r'src="(https?://[^"]+)"', content)
ext_hrefs = re.findall(r'href="(https?://[^"]+)"', content)
print()
print('外部 JS 依赖:')
for s in ext_srcs:
    print(f'  {s[:100]}')
print('外部 CSS 依赖:')
for h in ext_hrefs:
    if 'font' in h or 'css' in h.lower():
        print(f'  {h[:100]}')

# 统计 CSS 行数 vs JS 行数
style_start = content.find('<style')
style_end   = content.find('</style')
script_starts = [m.start() for m in re.finditer(r'<script', content)]
css_lines = content[style_start:style_end].count('\n')
print()
print(f'CSS 区块行数 (估): {css_lines}')

# data/ 文件懒加载列表
lazy_protos = re.findall(r"'([a-z]+)'\s*:", content[content.find('const PROTO_META'):content.find('const PROTO_META')+800])
print()
print(f'PROTO_META 中协议数: {len(set(lazy_protos))}')
print(f'  协议: {sorted(set(lazy_protos))}')
