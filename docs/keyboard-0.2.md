# 0.2.0：完整键盘与逐键落爪

原来键盘仅是无字装饰图，爪子只能在原位上下摆动。本版改为统一 ANSI/QWERTY 104 键布局，包含字母数字、F1–F12、左右修饰键、导航/方向区和数字区。左右爪按全局事件中的 VK 定位到对应键帽中心；空格分开落双爪，按下高亮、松开短暂反馈后清除。

同侧连续输入从当前爪坐标重新计算 75ms 平滑移动，不重置敲击相位；同手组合键按最近仍按住的键定位，释放最新键后回到其他仍按住的键；没有按住的键时恢复待机。按住集合、当前目标与短暂高亮只存在于内存中，关闭/暂停 reset，不存逐键历史或输入文本。

## 改动

- `shared/keyboard-layout.ts`：104 键的唯一键位/标注/几何定义、通用修饰键 alias、待机坐标与 640×600 显示尺寸。
- `src/Keyboard.tsx`、`src/style.css`：矢量键帽、清晰字样和按下高亮。
- `src/animation.ts`：每爪独立移动目标、平滑路径、按住组合与高亮过期。
- `src/App.tsx`：动态爪坐标、前腿连接、只更新变动的键帽状态；点击遮罩与统一键盘外形一致。
- `electron/main.ts`：放大实际显示、默认键位与用户覆盖合并；原生输入监听机制未替换。
- `scripts/keyboard-asset.mjs`、`public/models/prototype/keyboard.svg`：从同一布局生成静态 SVG。
- `tests/core.test.ts`、`scripts/keyboard-render-test.mjs`：几何完整性、逐字母目标、连续移动/组合/空格及实际 renderer 的坐标和高亮检查。
- `scripts/package.mjs`、`archive.mjs`、版本清单：按版本独立输出，保留原 0.1.0 发布目录。

## 已执行验证

- `npm run build`：通过，生成 104 个带字键帽，TypeScript 和 Vite 构建通过。
- `npm test`：16 项通过，其中新增 5 项覆盖 104 键、26 个字母坐标、连续切换、Ctrl+A/监听 reset、双爪空格。
- `node scripts/keyboard-render-test.mjs`：实际启动 Electron，确认 104 个 SVG 键帽，A–Z 均能正确高亮及落爪，A/J 两爪同时定位，松开无残留。开发版通过；结果与截图在 test-results 中。
- 本轮界面测试为受控 IPC 动画事件，未将它说成真实物理键盘/其他应用前台输入验收；全局监听仍沿用初版已核对的 Win32 VK 事件通路。

已目视检查 `keyboard-idle.png` 与 `keyboard-AJ.png`。默认显示比旧版放大两倍，逻辑坐标仍为 320×300，因此全局鼠标/DPI 换算和模型图层尺寸不变。大小仍可调节。

## 限制

只读取 VK 的原生接口无法区分主 Enter 与小键盘 Enter，也不能可靠区分 NumLock 关闭后的数字区导航键。两处 Enter 会同时高亮，爪默认指主 Enter。默认是 ANSI/QWERTY，其他物理布局需要调整统一布局定义。爪子和前腿在按下时会遮住少量键帽，这是指向相应位置的实际图层覆盖。

新版发布位于 `release/0.2.0/`，原版保留。未添加遥测、按键统计、文本/剪贴板采集或网络发送。

## 发布版复核

已直接运行 release/0.2.0/PuddingPet-win32-x64/PuddingPet.exe：逐键 renderer 的 4 项检查和桌面冒烟的 8 项检查均通过；窗口 640×600、125% 缩放为 800×750，无 renderer error。报告见 keyboard-render-packaged.json 与 desktop-smoke-0.2.json。打包首次遇到 Windows 解压临时文件 rename EPERM，使用 packager 官方 afterExtract 等待文件释放后成功；没有修改系统安全设置。
