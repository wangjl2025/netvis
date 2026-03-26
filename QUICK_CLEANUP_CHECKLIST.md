# 🚀 快速执行清单 — NetViz 项目清理

**优先级**：🔴 立即执行  
**预计时间**：1.5 小时  
**目标**：清理项目根目录，提升可维护性

---

## ✅ 任务 1：清理备份文件（5 分钟）

### 当前状态
```
12 个备份文件，占用 ~2.5MB
├─ backup-20260326-1016 ← 删除
├─ backup-20260326-1333 ← 删除
├─ backup-20260326-1409 ← 删除
├─ backup-20260326-1434 ← 删除
├─ backup-20260326-1445 ← 删除
├─ backup-20260326-1503 ← 删除
├─ backup-20260326-1713 ← 删除
├─ backup-20260326-2030 ← 删除
├─ backup-20260326-2147 ← 保留（前天）
├─ backup-20260326-2200 ← 保留（前天）
├─ backup-20260326-2220 ← 保留（前天）
└─ backup-20260327-0008 ← 保留（今天最新）
```

### 执行步骤
```powershell
# 删除 9 个旧备份
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1016" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1333" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1409" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1434" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1445" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1503" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-1713" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-2030" -Recurse -Force
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\backup-20260326-2200" -Recurse -Force
```

### 预期结果
- ✅ 释放 ~2MB 磁盘空间
- ✅ 项目根目录更清爽
- ✅ 保留最近 3 个备份用于紧急恢复

---

## ✅ 任务 2：整理检查脚本（30 分钟）

### 当前状态
```
20+ 个检查脚本散落在项目根目录
arch_check.py / arch_check2.py / arch_check3.py
check_*.py（10+ 个）
verify_*.py（7 个）
diag.py / final_check.py / make_test.py
```

### 执行步骤

#### 2.1 创建 scripts 目录
```powershell
New-Item -ItemType Directory -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts" -Force
```

#### 2.2 移动脚本文件
```powershell
# 移动所有检查脚本
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\arch_check*.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\check_*.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\verify*.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\diag.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\final_check.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\make_test.py" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\scripts\"
```

#### 2.3 创建 scripts/README.md
```markdown
# 检查脚本说明

## 数据验证脚本
- `check_fields.py` - 验证所有协议的字段描述是否完整
- `check_detail.py` - 详细检查协议数据结构
- `check_all.py` - 全面检查（字段 + 知识点 + 思考题）
- `check_issues.py` - 检查已知问题列表

## 协议特定脚本
- `check_dns_kb.py` - DNS 知识点检查
- `check_cong*.py` - TCP 拥塞控制检查
- `check_tcpcong*.py` - TCP 拥塞控制详细检查
- `check_nat_multi.py` - NAT 多模式检查
- `check_align.py` - 字段对齐检查

## 验证脚本
- `verify*.py` - 各版本的验证脚本（verify6.py 最新）
- `verify_badge.py` - 徽章系统验证
- `verify_mobile.py` - 移动端适配验证
- `verify_fix.py` - 修复验证

## 其他脚本
- `arch_check*.py` - 架构检查（arch_check3.py 最新）
- `diag.py` - 诊断脚本
- `final_check.py` - 最终检查
- `make_test.py` - 测试生成

## 使用建议
- 定期运行 `check_all.py` 进行全面检查
- 新增协议后运行 `verify6.py` 验证
- 移动端测试前运行 `verify_mobile.py`
```

### 预期结果
- ✅ 项目根目录减少 20+ 个文件
- ✅ 脚本集中管理，便于维护
- ✅ 清晰的脚本用途说明

---

## ✅ 任务 3：删除过时测试文件（10 分钟）

### 当前状态
```
test_cong.html (256KB) - 可能是旧版本
test_cong_minimal.html (13KB) - 最小化版本
test_cong_svg.html (2.5KB) - SVG 测试
ui-prototype.html.bak-* - 备份文件
index.html.bak-* - 备份文件
```

### 执行步骤

#### 3.1 备份测试文件（以防需要恢复）
```powershell
New-Item -ItemType Directory -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\archived" -Force
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\test_cong.html" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\archived\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\test_cong_minimal.html" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\archived\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\test_cong_svg.html" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\archived\"
Move-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\*.bak-*" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2\archived\"
```

#### 3.2 更新 .gitignore
```
# 在项目根目录创建或更新 .gitignore
archived/
scripts/
.workbuddy/
*.bak-*
```

### 预期结果
- ✅ 项目根目录减少 5 个文件
- ✅ 测试文件集中在 archived/ 目录
- ✅ 便于后续清理

---

## ✅ 任务 4：统一协议数据命名（15 分钟）

### 当前状态
```
data/congestion.js - 文件名
data/tcpcong.js - 可能重复？
protocolDB['tcpcong'] - 代码中的 key
```

### 执行步骤

#### 4.1 检查两个文件是否重复
```powershell
# 比较文件大小和内容
Get-Item "C:\Users\wangjl\Desktop\20260318\neetwork2\data\congestion.js"
Get-Item "C:\Users\wangjl\Desktop\20260318\neetwork2\data\tcpcong.js"
```

#### 4.2 统一命名（假设 tcpcong.js 是正确的）
```powershell
# 如果 congestion.js 是旧版本，删除它
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\data\congestion.js" -Force

# 如果 tcpcong.js 是旧版本，删除它
Remove-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2\data\tcpcong.js" -Force
```

#### 4.3 验证 index.html 中的引用
```javascript
// 搜索 index.html 中的所有引用
// 确保都使用 'tcpcong' 而不是 'congestion'
```

### 预期结果
- ✅ 文件名与 protocolDB key 一致
- ✅ 避免加载错误
- ✅ 减少混淆

---

## ✅ 任务 5：创建项目清理总结（10 分钟）

### 执行步骤

#### 5.1 创建 CLEANUP_LOG.md
```markdown
# 项目清理日志

## 2026-03-27 清理记录

### 删除的备份文件
- backup-20260326-1016 ~ backup-20260326-2200（9 个）
- 释放空间：~2MB

### 整理的脚本文件
- 移动 20+ 个检查脚本到 scripts/ 目录
- 创建 scripts/README.md 说明文档

### 删除的测试文件
- test_cong.html / test_cong_minimal.html / test_cong_svg.html
- *.bak-* 备份文件
- 移动到 archived/ 目录

### 统一的命名
- 确认 tcpcong.js 为正确版本
- 删除 congestion.js（如重复）

### 项目根目录优化前后
- 优化前：~50 个文件
- 优化后：~20 个文件
- 减少：60% 的文件数量
```

---

## 📊 清理效果预览

### 优化前
```
neetwork2/
├─ index.html (256KB)
├─ ui-prototype.html (226KB)
├─ server.js
├─ README.md
├─ arch_check.py / arch_check2.py / arch_check3.py
├─ check_*.py (10+ 个)
├─ verify_*.py (7 个)
├─ test_cong.html / test_cong_minimal.html / test_cong_svg.html
├─ *.bak-* (多个)
├─ backup-20260326-* (12 个)
├─ data/ (15 个协议文件)
├─ modules/ (2 个)
├─ docs/ (1 个)
└─ .workbuddy/
```

### 优化后
```
neetwork2/
├─ index.html (256KB)
├─ ui-prototype.html (226KB)
├─ server.js
├─ README.md
├─ PROJECT_AUDIT_REPORT.md ← 新增
├─ CLEANUP_LOG.md ← 新增
├─ scripts/ ← 新增
│  ├─ README.md
│  ├─ arch_check3.py
│  ├─ check_*.py
│  ├─ verify6.py
│  └─ ...
├─ archived/ ← 新增
│  ├─ test_cong.html
│  ├─ test_cong_minimal.html
│  ├─ test_cong_svg.html
│  └─ *.bak-*
├─ backup-20260326-2147/
├─ backup-20260326-2200/
├─ backup-20260326-2220/
├─ backup-20260327-0008/
├─ data/
├─ modules/
├─ docs/
└─ .workbuddy/
```

---

## 🎯 验证清单

清理完成后，请逐一验证：

- [ ] 备份文件从 12 个减少到 4 个
- [ ] 项目根目录文件数减少 60%
- [ ] scripts/ 目录包含所有检查脚本
- [ ] archived/ 目录包含所有过时文件
- [ ] index.html 仍能正常加载
- [ ] 所有协议数据正常显示
- [ ] 移动端适配正常
- [ ] 分享功能正常

---

## 💾 备份建议

清理完成后，建议：

1. **创建最终备份**
   ```powershell
   # 备份整个项目
   Copy-Item -Path "C:\Users\wangjl\Desktop\20260318\neetwork2" -Destination "C:\Users\wangjl\Desktop\20260318\neetwork2-backup-20260327-cleaned" -Recurse
   ```

2. **上传到 GitHub**
   ```bash
   git add .
   git commit -m "chore: cleanup project structure - remove old backups, organize scripts"
   git push origin main
   ```

3. **建立定期备份策略**
   - 每天 EOD 自动备份一次
   - 保留最近 7 天的备份
   - 每月归档一次

---

## 📞 需要帮助？

如果在执行过程中遇到问题，可以：
1. 查看 PROJECT_AUDIT_REPORT.md 了解详细背景
2. 参考 scripts/README.md 了解各脚本用途
3. 检查 CLEANUP_LOG.md 了解清理历史

---

**清单创建时间**：2026-03-27 00:10  
**预计完成时间**：1.5 小时  
**优先级**：🔴 立即执行
