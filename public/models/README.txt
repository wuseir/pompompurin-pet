自定义 2D 模型：将 model.json、body.svg、left-paw.svg、right-paw.svg、keyboard.svg 放到本目录。
每个图层必须是 320 × 300 透明画布（SVG viewBox="0 0 320 300" 或同尺寸 PNG）。
文件名可在 model.json.layers 中修改，仅接受本目录的简单文件名，不接受子目录、脚本和外部引用。
身体图层不绘制眼球，eyes.left/right 指定眼球中心，maxX/maxY 指定视线最大位移（0-10）。
左右爪的初始位置应接近 (112,215) 和 (208,215)，动画由程序平移/旋转。键盘可使用透明空图层。
示例 model.json：
{"name":"我的模型","layers":{"body":"body.svg","left":"left-paw.svg","right":"right-paw.svg","keyboard":"keyboard.svg"},"eyes":{"left":[125,139],"right":[194,139],"maxX":4.2,"maxY":3.2}}
准备好后，在设置中点击“重新加载”；不完整或不安全的模型会回退内置原型。
请自行确认角色、画师素材授权。MIT 代码许可证不授予 Sanrio 或第三方角色授权。
本版本不加载 Live2D。未来接入需 .model3.json、.moc3、纹理及授权，眼球参数与左右爪参数需单独映射。
