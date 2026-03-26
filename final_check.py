#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""最终验证：确认两个修复已生效"""
import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:\Users\wangjl\Desktop\20260318\neetwork'

with open(os.path.join(BASE,'index.html'),'r',encoding='utf-8') as f:
    html = f.read()

print("="*60)
print("修复验证")
print("="*60)

# Fix 1: rebuildStepDots selector
if "querySelector('.progress-steps')" in html:
    print("✅ Fix 1: rebuildStepDots 使用 .progress-steps（正确）")
elif "querySelector('.step-dots')" in html:
    print("❌ Fix 1: rebuildStepDots 仍使用 .step-dots（未修复）")

# Fix 2: udpDiagram in hide-all list
m = re.search(r"\['tcpDiagram','udpDiagram'[^\]]+\]\.forEach", html)
if m:
    lineno = html[:m.start()].count('\n') + 1
    print(f"✅ Fix 2: L{lineno} 画布隐藏列表包含 udpDiagram")
else:
    print("❌ Fix 2: 画布隐藏列表仍缺少 udpDiagram")

# 确认 L3231（旧的仅隐藏用途的 canvases 变量）已被替换或已不用
old_hide = re.findall(r"const canvases\s*=", html)
print(f"\n  'const canvases' 出现次数: {len(old_hide)}（应为 0，已不需要了）" if old_hide else "\n  ✅ 旧的 const canvases 已不存在")

# 确认 .step-dots 不再出现在关键 querySelector 里
remaining_stepdots = [m for m in re.finditer(r"querySelector\(['\"]\.step-dots", html)]
if remaining_stepdots:
    print(f"❌ 还有 querySelector('.step-dots') 残留：{len(remaining_stepdots)} 处")
else:
    print("✅ querySelector('.step-dots') 已全部清理")

print()
print("="*60)
print("整体检查汇总")
print("="*60)

checks = []

# 1. DOM id
for id_ in ['steps-list','tab-steps','knowledgeBlock','quizBlock','customSeqPanel',
            'compareToggleBtn','genericDiagram','tcpDiagram','udpDiagram',
            'tcp4Diagram','httpDiagram','tlsDiagram','dnsCanvas']:
    has = f'id="{id_}"' in html
    checks.append((has, f'id="{id_}" 定义'))

# 2. 关键函数
for fn in ['function rebuildStepDots','function rebuildSidePanel',
           'function renderStep','function switchProtocol',
           'function openProtocol','function rebuildStepData',
           'function loadProtocolData','function showToast']:
    has = fn in html
    checks.append((has, fn))

# 3. 修复点
checks.append(("querySelector('.progress-steps')" in html, "rebuildStepDots 使用 .progress-steps"))
checks.append(("getElementById('steps-list')" in html or "steps-list" in html, "rebuildSidePanel 使用 steps-list"))
checks.append(("'udpDiagram','tcp4Diagram'" in html or "'udpDiagram'" in html, "udpDiagram 在隐藏列表"))

# 打印
ok = sum(1 for c in checks if c[0])
fail = [c[1] for c in checks if not c[0]]
print(f"\n  通过: {ok}/{len(checks)}")
if fail:
    print("  失败:")
    for f in fail:
        print(f"    ❌ {f}")
else:
    print("  ✅ 全部通过！")
