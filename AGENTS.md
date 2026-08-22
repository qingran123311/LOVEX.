# 微调项目 — 修复记录 & 教训统计 (2026/8/14 — 2026/8/22)

> 防御性记录：防止重复犯同样的低级错误。

## 一、基础设施 / 运行环境教训

### 1. PowerShell 5.1 读写 UTF-8 脚本文件时会把中文当 GBK 解码
- **犯过的错**：写 `.ps1` 脚本时，脚本文件里一旦包含中文字符串/注释，就会被 PowerShell 5.1 按“系统默认 ANSI (GBK)”方式读入 → 语法被破坏（ParserError: UnrecognizedToken）；
- 而 `bash` 调用 `powershell -Command '...'` 传 `C:\Users\...\微调\...` 这样含中文路径给命令行时，PowerShell 收到的其实是 UTF-8（bash 不转码），所以命令行模式 OK，但**.ps1脚本文件本身**坏掉；
- **教训**：永远不要把中文写进 `.ps1` 脚本里（除非保存为 UTF-8 BOM）。解决方案：中文搜索词用 `[char]0xXXXX` 拼接绕开，或走 `.ps1` 用 `$ExecutionContext` / 传参。

### 2. BOM 去除写错位数 → 文件开头毁了
- **犯过的错**：`$bytes[2..($bytes.Length-1)]` 删掉 BOM 的 `EF BB` 两字节，漏掉第三字节 `BF` → 输出文件开头是 `BF(function...` → 直接 SyntaxError 不能加载；
- **教训**：UTF-8 BOM = 3 字节 `EF BB BF`，PowerShell 数组切片 `$bytes[N..M]` **含首不含尾** → 去 BOM 必须 `$bytes[3..($bytes.Length-1)]`。**永远从 `[BitConverter]::ToString($bytes,0,3)` 核对首3字节是否是 EF-BB-BF。**

### 3. bash 透传 `$` 变量被 bash 食掉
- **犯过的错**：`powershell -Command "...$b.Length..."` → `$b` 被 bash 作变量展开（空） → PowerShell 看到的是 ` .Length` → ExpectedValueExpression；
- **教训**: 通过 `bash` 调用 PowerShell 时 **不用任何 `$`**，把逻辑写进 `.ps1` 文件再 `-File` 运行。

### 4. 所有修改都以“从 final24 开始”为错锚
- **犯过的错**：以为 `final24.js`（22号早 7:51）是基线，往里面改；殊不知 `final24` 已被**加了 UTF-8 BOM + 乱码中文**（E9-8D-92-3F 之类无效 UTF-8 序列）—— 根本 **不是可用的 JavaScript**：浏览器报 `Invalid regular expression`；
- **教训**：**改动之前一定先 `Get-Content … -Encoding Byte` 看首3字节** + 拼一个 tiny “parse me” 检查（括号平衡/round-trip 无损）；**历史备份 `final24.js` 已废弃，后续只信 `final22.js` 起点。**

## 二、app.js 功能逻辑修复记录

基线：**final22.js**（2026/8/20 15:29，`(...)` 开头，无 BOM，合法 UTF-8）。

### 问题2 — 查岗只触发一个人 (`Us` / `checkPatrolDue`)
- **bug**：`var n=!1; ... if(!(n||tr.length)){... (tr.push(a), n=!0) ...}` → 第一人中标后 `n=1` 导致余下联系人全被跳过（`n||tr.length`永远真）；同时 `patrolCooldownMin` 冷却又卡住剩下轮次 → 实质**一次只弹1人**；
- **改处** (`app.js` ~patrol 调度处)：去掉 `var n` + `if(!(n||tr.length)){` 封装，用 `(tr.push(a),a.lastPatrolAt=e,oe(a)):(a.lastPatrolAt=e,oe(a))` 让**所有到期人排队；push 时即刷新 _lastStatusAt_**。
- **数据修复**：旧联系人的 `lastPatrolAt` 被之前bug写入近期时间戳，导致它们要等很久。在 `Us()` 开头加一次性数据清理（localStorage标记），把所有联系人的 `lastPatrolAt` 清零，让它们立即有资格触发。

### 问题3 — 查岗汇报弹窗误显示“报备一下/才不要”
- **bug**：CSS 里 `.patrol-actions{display:flex}`（all.css）把 tailwind 的 `.hidden{display:none}` **同特异性覆写**；`classList.add/remove("hidden")` 失效 → result(汇报)弹窗把 request(按钮)框也露出来；
- **改处** (`openPatrolPopup`)：改成 `o.style.display="none"/"flex"` **直接内联样式**，绕过 CSS 冲突，不影响其它功能。

### 问题4 — 状态上线/刷新就重置
- **bug**：`Fn()` 状态循环 `setTimeout(...,r+Math.random()*(i-r))` 只看随机间隔，**无视 `_lastStatusAt`** → 刷新页面重开循环 → 很快又换一次，违反“不到时间不换”。
- **改处**：改为 `base=r+Math.random()*(i-r), elapsed=Date.now()-(t._lastStatusAt||0), delay=Math.max(0,base-elapsed)` → 刷新/上线若距上次不到 min 就等到剩余时间；到期就马上按概率换。

### 问题5 — 视频通话时长错乱/秒挂 (Fs/Md 挂断定时器)
- **症状**：视频通话不按设置的时长范围，短时间内就被对方挂断（21号上传版出现）；
- **根因**：联系人设置保存用 `parseFloat(this.value)||0` → 输入清空/0 时 `callHangupMin/Max=0`；挂断调度 `Fs()`(私聊)/`Md()`(群) 里 `t*6e4=0` → `setTimeout(fn, 0)`=**延时0** → 立即触发，60%概率马上挂断，否则重排继续0延时循环 → 几秒内必挂。单位换算 x()/B() 经核对是正确互逆（基准单位"分"），不是元凶；
- **第一版修法（已废弃）**：读侧 `t>0||(t=f.callHangupMin||2)` 回退全局默认——**被用户否决：不许悄悄回退全局**；
- **最终修法**：
  1. 保存端 `ch-call-hangup-min/max` 的 onchange：只有 `parseFloat>0` 才写入；非法输入把输入框显示恢复成当前存储值（经 B() 换算回显），**绝不写 0/垃圾进 DB**；
  2. 读取端 Fs/Md：`if(!(t>0&&n>0))return;` —— 数据无效就**不安排自动挂断**（通话不会被切），不发明默认值、不碰全局。
- **教训**：
  - 所有 `||0` 兜底的数字输入是垃圾数据源头，必须在**保存端**拒绝，而不是消费端编默认值；
  - 用户明确要求：**禁止静默回退全局默认**——没配置就是功能关闭，不是"替用户做主"；
  - **不许一出问题就加防护糊弄，必须修根源**（用户原话级别的铁律）；
  - PowerShell 变量名**大小写不敏感**：`$nb`(字节数组) 和 `$nB`(新字符串) 是同一个变量，互相覆盖导致校验假阴性。

### 问题6 — 全站扫除 `||0`/`||N` 垃圾保存写法 (21 处)
- **范围**：联系人回复设置面板所有数字输入 onchange/oninput；
- **修法（与问题5同一规矩）**：
  - 单位换算类 14 处 (`activeMsgMin/Max、letterReplyMin/Max、partnerLetterMin/Max、postReplyMin/Max、commentReplyMin/Max、momentMin/Max、statusMin/Max`)：`var v=parseFloat(this.value);v>0?d.K=x(v,...):this.value=B(d.K,...)` —— 合法才写库，非法把输入框回显成当前存储值；
  - 纯整数类 5 处 (`maxCardsPerReplyUser、letterCardCountMin/Max、combineCardsMin/Max`)：同上，`v>=1?M(K,v):this.value=M(K)`；
  - `partnerTimeFlowSpeed`：合法才写库+应用时间流速，非法回显；
  - `statusChance`(oninput)：只守写库口子（`isFinite&&0..100` 才写），**不回显 DOM**——oninput 每敲一键都触发，回显会打断输入；
- **不动的**：群面板 gh-* 的两个 range 滑条（`parseInt(this.value)||2/8`）——range 控件永远有合法值，产生不了垃圾；
- **结果**：全文件 `parseFloat(this.value)||0` 剩 0 处。

### 问题1 — 被动回复“输入中”永久卡
- **bug**：全局 DB 队列 `So(){ gc.then(()=>e()) }` ，任一写挂 (IndexedDB request onsuccess 不触发 / 前面事务未完) → `gc` 终生 pending → 后面**所有** `Vn` 卡死 → `zc` await 永不返回 → `finally` 不跑 → `Ee` 递减不到0 → `$!/true` → `Li()` 不调用 → typing 标志留在 UI。多个联系人**同时**卡死。
- **改处** (`So` + `os`)：
  1. `So` 加 8 s `Promise.race` 超时 → 队列最多 8 s 阻塞；超时后 `gc = u.catch(...)` 得以 recover（后续 Vn 不排一堆死队）；
  2. `os` 加 150 s 兜底 `setTimeout` → 任何情况下 `_lastStatusAt` 后 `Li(r)` 必定执行，输入中标志必清除；
- **效果**：即使 DB 死锁，最多 8 s 后队列恢复、最多 150 s 后输入中消失，从此不“永久卡死，多个联系人全挂”。

## 三、文件落盘清单
- `app.js`        — final22 + 11 处修复 (923693 字节)
- `backup-0814/final26.js` — 同 app.js 备份
- `index.html`    — `app.js?v=20260822b` 缓存版本号 → **务必 Ctrl+F5 强刷！**

## 四、OpenCode Zen API 接法 (备忘)
- 端点：`https://opencode.ai/zen/v1/chat/completions`（OpenAI 兼容格式）
- 鉴权：`Authorization: Bearer <API_KEY>`，key 从 https://opencode.ai/auth 登录后获取
- 模型列表：GET `https://opencode.ai/zen/v1/models`
- 该端点可用模型：deepseek-v4-pro/flash、minimax-m3、glm-5.2/5.1、kimi-k2.x/k3、big-pickle(免费) 等
