import keyImages from "./keycode";

function Keyboard({ activeKeyMap }: { activeKeyMap: Record<number, boolean> }) {
  return (
    <>
      {Object.entries(keyImages).map(([key, value]) => (
        <img
          key={key}
          style={{
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            display: activeKeyMap[key] ? "block" : "none",
          }}
          src={"./BongoCatModels/standard/resources/left-keys/" + value}
          alt=""
        />
      ))}
    </>
  );
}

export default Keyboard;
