import { useState, useEffect, useCallback } from "react";
import { Download, X, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function RetailInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("retail-pwa-dismissed") || isInStandaloneMode()) {
      setDismissed(true);
      return;
    }

    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("retail-pwa-dismissed", "true");
  };

  if (dismissed) return null;

  // iOS Safari guide
  if (showIOSGuide) {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install ApniDukaan App</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                <span>Tap the <Share className="inline h-3.5 w-3.5 text-primary mx-0.5 -mt-0.5" /> <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                <span>Scroll down and tap <SquarePlus className="inline h-3.5 w-3.5 text-primary mx-0.5 -mt-0.5" /> <strong>Add to Home Screen</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                <span>Tap <strong>Add</strong> to install the app</span>
              </div>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Android / Chrome install prompt
  if (!deferredPrompt) return null;

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install ApniDukaan App</p>
        <p className="text-xs text-muted-foreground">Faster ordering from your home screen!</p>
      </div>
      <Button size="sm" onClick={handleInstall}>
        Install
      </Button>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
