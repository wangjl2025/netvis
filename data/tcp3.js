/**
 * TCP 三次握手 — 动态生成数据（占位符文件）
 *
 * ⚠️  重要：此文件不包含实际协议数据，内容为空！
 *
 * 数据生成流程：
 *   1. 用户点击"TCP 三次握手"卡片，触发 openProtocol('tcp3')
 *   2. loadProtocolData('tcp3') 加载本文件（内容为空，仅作为懒加载触发器）
 *   3. index.html 中的 rebuildStepData() 被调用
 *   4. rebuildStepData() 根据初始序列号（默认 100）动态生成 stepData
 *   5. 生成的数据直接写入 protocolDB['tcp3']，之后由 renderStep() 渲染
 *
 * 为什么要动态生成，而不是静态写在这里？
 *   - TCP 握手的 seq/ack 数值需要根据初始序列号推导
 *     （如 ISN=100 → SYN seq=100 → SYN-ACK ack=101 → ACK seq=101）
 *   - 用户可以在 UI 上自定义 ISN，查看不同起点的握手过程
 *   - 动态生成能实时计算并在字段 derive 中展示推导过程
 *
 * 如何修改 TCP 三次握手的内容？
 *   → 编辑 index.html 中的 rebuildStepData() 函数
 *     - steps[]      修改步骤标题/描述
 *     - knowledge[]  修改知识点
 *     - quiz[]       修改思考题
 *     - fieldsFn()   修改各步骤的字段和 derive 推导
 *
 * 🚫 请勿在此文件中添加任何 protocolDB 赋值代码！
 */
