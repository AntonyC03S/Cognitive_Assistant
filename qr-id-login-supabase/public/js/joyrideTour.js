import { createElement, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import Joyride, { STATUS } from "https://esm.sh/react-joyride@2.8.2";

export function initJoyrideTour({
  mountId = "joyrideRoot",
  autoStart = false,
  getTimerCtrl,
  onComplete
} = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const root = createRoot(mount);

  function App() {
    const steps = useMemo(() => ([
      {
        target: ".timerBig",
        title: "Timer",
        content: "You have 30 minutes. Pause/Resume controls the countdown. When it hits 00:00, you get logged out."
      },
      {
        target: "#endBtn",
        title: "End session",
        content: "Ends the session immediately and takes you to the ending screen."
      },
      {
        target: "#myUploadsLink",
        title: "My uploads",
        content: "Shows all images you uploaded on your account."
      },
      {
        target: "#showQrViewBtn",
        title: "QR / Workspace switch",
        content: "Use these buttons to switch between QR upload view and the whiteboard workspace."
      },
      {
        target: ".chatBox",
        title: "AI chat",
        content: "Ask Google AI questions here while working in either QR or Workspace view."
      },
      {
        target: "#makeQrBtn",
        title: "Generate QR",
        content: "Creates a new session and generates a QR code to scan on your phone."
      },
      {
        target: "#qr",
        title: "QR code",
        content: "Scan this with your phone to open the upload page."
      },
      {
        target: "#uploadLink",
        title: "Upload link",
        content: "Same as the QR link (useful for copying/testing)."
      },
      {
        target: "#resultImg",
        title: "Preview",
        content: "After you upload, the latest image for this session appears here automatically."
      },
      {
        target: "#showWorkspaceViewBtn",
        title: "Open workspace",
        content: "Click Workspace for the combined drawing board, text, and images."
      },
      {
        target: "#workspaceBoardShell",
        title: "Workspace",
        content: "One board: draw and erase, text boxes, photos from files or URLs, and Arrange mode to move or resize images. Export saves the whole scene."
      },
      {
        target: "#wsDrawBtn",
        title: "Tools",
        content: "Draw and Erase use the brush; Text adds editable boxes; Arrange selects images to drag or resize."
      },
      {
        target: "#wsArrangeBtn",
        title: "Arrange",
        content: "Switch here to move and resize photos on the board."
      },
      {
        target: "#logoutBtn",
        title: "Log out",
        content: "Logs you out and sends you back to the login screen."
      }
    ].map((step) => ({ ...step, disableBeacon: true }))), []);

    const [run, setRun] = useState(autoStart);
    const [stepIndex, setStepIndex] = useState(0);
    const wasRunningRef = useRef(null);

    function start() {
      setStepIndex(0);
      setRun(true);
    }

    // Help button restarts the tour from step 1
    useEffect(() => {
      const helpBtn = document.getElementById("helpBtn");
      if (!helpBtn) return;

      helpBtn.addEventListener("click", start);
      return () => helpBtn.removeEventListener("click", start);
    }, []);

    // pause timer when tour is running (but only resume if it was running before)
    useEffect(() => {
      const t = getTimerCtrl?.();
      if (!t) return;

      if (run) {
        if (wasRunningRef.current === null) wasRunningRef.current = t.isRunning?.() ?? true;
        if (t.isRunning?.()) t.pause?.();
      } else {
        if (wasRunningRef.current === true) t.resume?.();
        wasRunningRef.current = null;
      }
    }, [run]);

    function handleCallback(data) {
      const { status, index, type, action } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        setStepIndex(0);
        onComplete?.();
        return;
      }

      // Controlled stepIndex must follow Joyride's next/prev; always incrementing broke Back.
      if (typeof index === "number" && type === "step:after") {
        if (action === "next") {
          if (index === 9) {
            document.getElementById("showWorkspaceViewBtn")?.click();
          }
          setStepIndex(index + 1);
        } else if (action === "prev") {
          if (index === 9) {
            document.getElementById("showQrViewBtn")?.click();
          }
          setStepIndex(Math.max(0, index - 1));
        }
      }
    }

    return (
      createElement(Joyride, {
        steps,
        run,
        stepIndex,
        continuous: true,
        showSkipButton: true,
        showProgress: true,
        scrollToFirstStep: true,
        disableOverlayClose: true,
        spotlightClicks: false,
        callback: handleCallback,
        styles: {
          options: {
            zIndex: 3000,
            overlayColor: "rgba(0,0,0,0.68)",
            primaryColor: "#111",
            textColor: "#111",
            arrowColor: "#fff",
            backgroundColor: "#fff"
          }
        }
      })
    );
  }

  root.render(createElement(App));
}