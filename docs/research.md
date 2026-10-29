# 选型与源码证据（2026-10-29）

调研以固定 commit 的 README、源码、许可证及构建配置为依据。源码文本通过 GitHub 连接器取得，原始上游文本快照保留于 upstream/chiikawa-pets；没有导入上游角色二进制素材。此报告记录开发阶段的选型，当前仓库按用户要求提供源码与原型效果图。

| 项目 | 实际核对结果 | 改造成本与结论 |
| --- | --- | --- |
| [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat/tree/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b) | 当前 v2.4.1，2026-10-28 提交，Apache-2.0。Rust 2024、GPUI、D3D11、Cubism；不是旧 Tauri 架构。`bongocat-platform/src/windows.rs` 使用 Raw Input INPUTSINK、GetCursorPos、状态校正；`bongocat-overlay/src/windows/window.rs` 使用 NOACTIVATE、透明/穿透样式。`bongocat-live2d/src/parameter.rs` 提供 EyeBallX/Y；model store 导入 `.model3.json`、moc3、纹理和动作。`Cargo.toml` 固定 Rust 1.97，`rust-toolchain.toml` 为 1.97.1，构建入口 `just build`。 | 功能与维护最完整，长期持有已授权 Live2D 时首选。当前机器 PATH 及用户 cargo 目录未找到 Rust/MSVC 工具链，且源码没有现成 SVG 渲染器。为支持 2D 原型需增加原生渲染后端。SDK/素材的再分发许可需单独确认。本次不修改此仓库，不把它转写成 Electron。 |
| [Duck-Claw/bongo-dog](https://github.com/Duck-Claw/bongo-dog/tree/8549eda749443bfe33600d06fe8ce39a85071141) | 2026-04-30 最后提交（两条历史），Electron 28.3.3，uiohook-napi；Windows 在 main.js 全局监听 keydown，硬编码左右映射。没有 keyup 或 Live2D 导入。main.js 在 show 时主动 focus；renderer 开放 Node 且未隔离。README 声明 MIT，但仓库没有独立 LICENSE。index.html 保存每日/7 天按键统计。scripts/build-win.js 使用 Unix cp/unzip/zip，且以 scripts 作为根，删除 Chromium 许可文件。 | 轻量示例，不能直接按当前配置分发。本次仅参考左右爪交互想法，没有复制其代码和素材，也没有引入统计。 |
| [meiguiyisenluo/chiikawa-pets](https://github.com/meiguiyisenluo/chiikawa-pets/tree/a6c949432296308fcc692cdf8d4f092c3838b849) | MIT 独立 LICENSE。README/文件更新集中在 2026-02；Electron 30、Vite、React、PixiJS 6、pixi-live2d-display。main.ts 已有透明/无框/置顶/托盘/原生全局事件桥；preload 隔离但 IPC 通道宽泛。`Chii/initLive2D.ts` 使用静态路径 model3，逐参数驱动鼠标；没有通用模型选择器。坐标直接除主屏尺寸、视线无插值；没有不抢焦点、监听开关和完整拖动命中实现。electron-builder 有 Windows x64 NSIS 配置。 | 本次选用其框架和原生事件适配基础。把 renderer 换成原型是原需求所需；保留 Electron/Vite/React，不混合完整项目。用成熟 Electron 能力补窗口行为、全局 DIP 坐标、托盘与设置。原项目没有可用测试脚本，新增测试覆盖改造范围。 |

## 最终改动边界

- `electron/main.ts`：沿用上游窗口/托盘架构，补 focusable:false、showInactive、像素遮罩穿透、拖动缩放、设置、显示隐藏、退出、显示器变化和生命周期清理。
- `electron/keyboard.ts` 与 `input-worker.cjs`：继续使用上游 Win32 hook 模块，版本固定为 1.0.17，在独立 utility process 中运行。只向主进程传 VK 和 down/up，再转换为动作。鼠标不经键盘 hook 转发，单独以 screen 接口 30 Hz 采样。
- 上游 native 源码 `win32_mouse_keyboard_hook.cc`：WH_KEYBOARD_LL/WH_MOUSE_LL，VK，无文本转换，始终 CallNextHookEx；但是无安装失败回报、stop 无 TSFN release。隔离进程退出由 Windows 清理 hook，避免主应用受 native abort/join 影响。启动状态仅证明进程 ready，不构成 hook 安装成功证明，需实机输入验证。原生模块 MIT 及其依赖许可证随应用保留。
- `src/animation.ts`、`src/App.tsx`：分层 SVG 原型、持续相位/弹簧动作、眨眼/呼吸、视线平滑与限幅；不随每次 keydown 重启动画时间线。松开丢失 1.6 秒后清理当前按住状态，锁屏/休眠/禁用时 reset。
- 保留上游全部 38 个文本文件于 `upstream/chiikawa-pets` 便于比对，不参与构建或发布。未复制上游模型、Cubism SDK、CDN 脚本、图标。

## 授权边界

应用代码的 MIT 不等于 Sanrio 布丁狗、Chiikawa 或模型画师的素材授权。内置 SVG 是本次手绘代码生成的非官方替代原型，不声称拥有角色 IP 或官方授权，仅用于本地验证与替换。没有从网上下载布丁狗图片或不明 Live2D。公开发布或商业用途前需取得角色及模型对应授权。README 和目录模板给出替换格式，素材不阻塞程序开发。

## 主要风险

- Electron 多进程内存开销高于原生 BongoCat；CPU/内存应按实际本机测量，不能仅凭技术栈推断。
- native hook 未提供安装回报、事件队列上限和系统权限诊断；独立进程减小故障范围，但无法证明所有安全软件、超高鼠标轮询率和长时间场景可靠。
- 当前非 Live2D，不能直接导入 model3/moc3。已授权 Live2D 可以交由 BongoCat 导入；要在本原型里使用，还需接入经授权的 Cubism renderer。
- DPI 统一用 Electron DIP；不同缩放多屏和负坐标由测试/实际硬件分别核实。安全桌面、管理员应用、独占游戏不绕过限制。

源码查询另核对 [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)、[screen](https://www.electronjs.org/docs/latest/api/screen) 官方文档；没有用网页 README 的流畅/性能描述代替本地测试。
