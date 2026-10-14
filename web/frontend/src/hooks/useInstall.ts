import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );
  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return {
    installed,
    canPrompt: !!prompt,
    install: async () => {
      if (!prompt) return;
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    },
  };
}
