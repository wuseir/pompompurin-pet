import Hachiware from "./components/Hachiware";
import BongoCat from "./components/BongoCat";
import Usagi from "./components/Usagi";
import Chii from "./components/Chii";
import { useEffect, useState } from "react";

type Pets = "chii" | "hachiware" | "usagi" | "BongoCat";

const App = () => {
  const [pet, setPet] = useState<Pets>("chii");
  useEffect(() => {
    const cch = (_event: Electron.IpcRendererEvent, c: Pets) => {
      setPet(c);
    };
    window.ipcRenderer.on("change-charator", cch);
    return () => {
      window.ipcRenderer.off("change-charator", cch);
    };
  }, []);

  let Pet = BongoCat;
  if (pet === "hachiware") Pet = Hachiware;
  else if (pet === "chii") Pet = Chii;
  else if (pet === "usagi") Pet = Usagi;
  else Pet = BongoCat;

  return <Pet />;
};
export default App;
