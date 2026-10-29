export type Action='left'|'right'|'both'|'none';
export type KeyBinding={action:Action;kind?:'tap'|'space'|'enter'|'modifier'|'arrow'};
export type KeyMap=Record<string,KeyBinding>;
export type Stroke={id:number;down:boolean;action:Action;kind:NonNullable<KeyBinding['kind']>};
export type InputStatus='starting'|'on'|'off'|'error'|'suspended';
export interface Settings {keyboardEnabled:boolean;mouseTracking:boolean;scale:number;opacity:number;keyBubble:boolean;fps:30|60;reducedMotion:boolean;position?:{x:number;y:number}}
export interface Model {name:string;layers:Record<'body'|'left'|'right'|'keyboard',string>;eyes:{left:[number,number];right:[number,number];maxX:number;maxY:number}}
export interface Snapshot {settings:Settings;status:InputStatus;model:Model;modelWarning:string;configWarning:string}
export type Command='settings'|'hide'|'show'|'quit'|'menu'|'reset-position'|'open-models'|'open-keymap'|'reload';
export interface PetAPI {
  initial():Promise<Snapshot>;
  update(patch:Partial<Settings>):Promise<void>;
  command(command:Command):void;
  drag(start:boolean):void;
  mask(mask:{width:number;height:number;alpha:number[]}):void;
  onStroke(cb:(stroke:Stroke)=>void):()=>void;
  onReset(cb:()=>void):()=>void;
  onState(cb:(state:Pick<Snapshot,'settings'|'status'>)=>void):()=>void;
  onCursor(cb:(point:{x:number;y:number})=>void):()=>void;
}
