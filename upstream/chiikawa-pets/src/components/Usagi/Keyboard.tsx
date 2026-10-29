import { Fragment } from "react/jsx-runtime";
import keyImages from "./keycode";

function Keyboard({ activeKeyMap }: { activeKeyMap: Record<number, boolean> }) {
  return (
    <>
      {Object.entries(keyImages).map(([key, value]) => (
        <Fragment key={key}>
          <img
            key={key + "keyboard"}
            style={{
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              display: activeKeyMap[key] ? "block" : "none",
            }}
            src={"./UsagiModels/standard/keyboard/" + value}
            alt=""
          />
          <img
            key={key + "hand"}
            style={{
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              display: activeKeyMap[key] ? "block" : "none",
            }}
            src={"./UsagiModels/standard/hand/" + value}
            alt=""
          />
        </Fragment>
      ))}
    </>
  );
}

export default Keyboard;
