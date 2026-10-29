# 0.1.0 历史验证报告 · 2026-10-29

当前 0.2.0 完整键盘与逐键落爪的验证见 [keyboard-0.2.md](keyboard-0.2.md)。本页保留初版实测数据，不将旧版尺寸/帧表现当作新版验收。

## 环境与构建

Windows x64，本机屏幕为 1920×1080、100% 缩放、单屏。系统 PATH 的 Node 是 16.20.2，不满足当前构建依赖；实际构建通过 `Node.js 24.22.1`（24.22.1）执行 npm，给子进程 PATH 优先该目录。

实际运行：

| 命令 | 结果 |
| --- | --- |
| `npm install --no-audit --no-fund` | 成功，生成 package-lock.json，原生 `.node` 由 npm 包携带，没有本地编译驱动 |
| `npm run build` | 类型检查 + 前端/main/preload 生产构建成功；首次 preload 泛型类型错误已修复 |
| `npm test` | 11 项通过，覆盖映射、未知键/坏配置、多键同时按下、持续相位/快速重复、松开恢复/丢失释放、双爪、视线限幅和平滑、透明遮罩、设置白名单、模型加载/脚本和路径校验 |
| `npm run test:desktop` | 8 项 Electron 实机进程/界面冒烟通过，无 renderer error；修复异步复选框回跳，并使测试等待异步进程退出；报告在 `test-results/desktop-smoke.json` |
| `npm audit --omit=dev --json` | 运行时依赖 0 条已知漏洞（npm 审计快照，不代表完整安全审计） |
| `npm run package:win` | 成功输出 Windows x64 便携目录。首次因临时目录 rename 被占用而失败，改为 packager 官方 `tmpdir:false` 直接输出配置后成功 |
| `PET_EXECUTABLE=release/PuddingPet-win32-x64/PuddingPet.exe npm run test:desktop` | 已直接启动发布 EXE，重复上述 8 项检查全部通过；Windows 实际通过子进程环境变量设置 PET_EXECUTABLE，没有使用 POSIX shell 语法 |
| `node scripts/archive.mjs` | 创建并列出校验便携 ZIP 与源码 ZIP，SHA-256 写入 release/SHA256SUMS.txt |

测试 Electron 运行时原安装下载未完成后改用 curl 获取镜像压缩包，对照 [Electron 官方 v45.1.0 release API](https://api.github.com/repos/electron/electron/releases/tags/v45.1.0) 的 `electron-v45.1.0-win32-x64.zip` digest 校验成功：

```text
55eaba17abff7b5bba6c3bbc85068967379024fe742fe9c7fdba9118922ccbe2
```

实际命令为 `curl.exe -L --fail --connect-timeout 15 --max-time 180 -o downloads/electron-v45.1.0-win32-x64.zip https://cdn.npmmirror.com/binaries/electron/45.1.0/electron-v45.1.0-win32-x64.zip`，然后 `node scripts/setup-runtime.mjs`。没有关闭 TLS 校验。打包会使用已核验的本地 archive。

## 验收逐项说明

| 验收项 | 实际证据与边界 |
| --- | --- |
| 显示角色 | Electron 实际加载四个 SVG 图层，捕获 `test-results/prototype.png` 并目视检查 |
| 真透明、无框、置顶、不抢焦点 | BrowserWindow 实机 isFocusable=false、isAlwaysOnTop=true；原生 capturePage 的 96,000 像素中约 55,424 为全透明、40,576 有绘制（随动画略变）。代码 frame=false/showInactive。没有完成办公应用持续真实打字时的焦点人工验收 |
| 透明区域点击穿透 | alpha 遮罩逻辑测试通过，实际主进程按全局鼠标位置切换 setIgnoreMouseEvents；由于 Windows 自动化窗口几何不可用，未声称实际点击穿透验收通过 |
| 前台其他应用全局键盘响应 | 独立系统事件注入 A/J 后，监听器 → 主进程 → renderer 全链路产生左/右爪运动，左测试 maxLeft=0.470/maxRight=0，右测试 maxRight=0.572/maxLeft=0。测试目标选为新建记事本，但未确认文字回显，不能视为真实物理键盘在记事本/浏览器中完整验收。实际监听不依赖窗口 DOM keydown |
| 左右映射与快速连续动作 | 105 个默认 VK 映射，单元测试包括约 600 次连续 step 与重复输入，运动相位递增、不重置、数值有限，松开后恢复。真实用户高速连续打字的视觉流畅度待人工确认 |
| 持续全局鼠标/视线 | 主进程真实 screen 坐标驱动，有全局视线数值采样；平滑、左右上下符号和限幅测试通过。物理鼠标四方移动、跨屏与不同 DPI 未完整验收 |
| 监听开关 | 实际设置 UI 关闭后状态 OFF，`app.getAppMetrics` 中独立 native helper 消失；重新开启后 helper 重建。关闭立即停止转发并 reset 动画，不影响鼠标追踪 |
| 隐私 | native 源码仅 VK 与 down/up；程序未使用 key text、clipboard、输入历史/计数/网络发送。设置写入白名单；运行时无远程脚本，HTTP/HTTPS/WS/WSS 请求在会话层阻止。此结论为源码/配置核对，并非全量抓包审计 |
| 托盘、拖动、缩放、隐藏、退出 | Tray 实际创建并持有；设置 UI 缩放至 400×375、恢复 320×300，以及隐藏/显示通过；app.close 正常退出。拖动/托盘右键逐项物理操作受自动化工具窗口几何问题限制，未完成全部人工验收 |
| 发布版本 | 见下方发布记录及 release/manifest.json；仅本地便携发布，无公开上传 |

## 自动化限制

Windows computer-use 的截图曾返回 `FrameArrived timed out`，刷新后可读 UIA 焦点，但浏览器标签的实际点击返回 `coordinate input geometry is unavailable`。因此停止进一步物理点击，未使用替代代码绕过工具限制。浏览器只创建了隔离空白测试页，随后关闭该测试页并结束 Tabbit 任务，未修改用户原有网页。

当前证据区分为：纯逻辑测试、Electron 实机进程/DOM 自动化、系统注入全局事件三类；没有把其中任何一类说成真实用户物理键鼠、浏览器输入、跨屏或长时验收。

## 性能边界

Electron 多进程有固定开销；设置窗口关闭且键盘关闭时一次快照约 181 MiB private bytes、356 MiB 各进程工作集之和（共享页面可能重复计数）。开启监听会增加一个 utility process。桌面冒烟报告中含设置窗口/测试开销，不是纯空闲 benchmark。未进行 8 小时 soak、游戏高频输入、锁屏休眠和多 DPI 多屏压力测试，不能承诺长期资源曲线。

设置关闭且监听开启时另一次快照约 203 MiB private bytes、451 MiB 进程工作集之和；这不是最小化后的工作集，也不是持续 CPU benchmark。不能宣称低内存或零 CPU。

## 本地发布记录

产物：`release/PuddingPet-win32-x64/PuddingPet.exe`，0.1.0，Windows x64，Electron 45.1.0；exe 大小 249,798,656 字节，SHA-256 为 `ebe8ab53ab9c01e213d4665f0ac1a148621713733a489ccbeb2f1e8165a19c92`。

保留 Electron/Chromium 与运行时依赖许可证。便携目录仅含明确允许的运行文件、依赖、说明及模型模板，移除生成目录中的开发缓存和 native PDB/OBJ/LIB。没有带入用户配置、测试编辑文本、全局按键序列或浏览器内容。没有签名、注册自动启动、写入外部服务或上传仓库。开发与发布版冒烟均正常退出，原始研究仓库不改动。

## 手工验收步骤

1. 双击发布目录 PuddingPet.exe，在记事本和浏览器输入框依次输入 A、J、12345、67890、空格、Enter、左右 Shift/Ctrl/Alt、方向键，再连续打字。
2. 保持编辑器光标不动，确认输入持续落在原应用；把鼠标移向屏幕四角，确认眼睛平滑看向相应方向。
3. 点击角色窗口空白角落，确认后方应用收到点击；拖动角色后松开，确认正常停下；右键角色/托盘检查菜单。
4. 关闭键盘监听，重复输入，确认状态 OFF 且爪子不再触发；鼠标视线仍有效。重新开启应恢复。
5. 测试 65/100/150% 大小、透明度、隐藏/显示、退出、重开位置；多屏硬件上重复跨 DPI 拖动与视线检查。

未完成项目作为明确剩余验收，不要求用户提供角色素材才能运行。
