/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    PIXI: any;
    Live2DModel: any;
  }
}

export async function initLive2D(canvas: HTMLCanvasElement) {
  const app = new window.PIXI.Application({
    view: canvas,
    autoStart: true,
    resizeTo: window,
    backgroundAlpha: 0,
  });

  const model = await window.PIXI.live2d.Live2DModel.from(
    "./ChiiModels/standard/cat_model/cat.model3.json",
  );

  app.stage.addChild(model);

  model.scale.set(0.5);
  model.anchor.set(0.5);
  model.x = app.renderer.width / 2;
  model.y = app.renderer.height / 2;

  return {
    setParameterValueById(id: string, value: any) {
      const core = model.internalModel.coreModel;
      return core?.setParameterValueById(id, value);
    },
    getParameterRange(id: string) {
      const core = model.internalModel.coreModel;

      const index = core?.getParameterIndex(id);
      const min = core?.getParameterMinimumValue(index);
      const max = core?.getParameterMaximumValue(index);

      return {
        min,
        max,
      };
    },
    destroy() {
      app.stage.removeChild(model);
      model.destroy(true);
      app.destroy(true);
    },
  };
}
