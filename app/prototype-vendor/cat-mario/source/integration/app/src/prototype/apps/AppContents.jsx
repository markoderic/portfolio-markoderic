import React, { lazy, Suspense } from "react";
// Stable across an initial suspended render: React may discard uncommitted
// boundary state. Only an explicit retry creates a replacement lazy record.
const InitialCatMario = lazy(() => import("./CatMario"));
function CatMarioLoading({ onTimeout }) {
  React.useEffect(() => {
    const timer = setTimeout(onTimeout, 20000);
    return () => clearTimeout(timer);
  }, [onTimeout]);
  return <p className="app-loading" role="status">Opening application…</p>;
}
class CatMarioBoundary extends React.Component {
  state = { error: false, Game: InitialCatMario };
  static getDerivedStateFromError(error) { return { error }; }
  timeout = () => this.setState({ error: new Error("Opening the application took too long. Retry when ready.") });
  retry = () => this.setState({ error: false, Game: lazy(() => import("./CatMario")) });
  render() {
    if (this.state.error) return <div className="app-loading" role="alert">
      <p>Cat Mario could not open.</p>
      <p>{this.state.error.message || "The application could not load or render. Try opening it again."}</p>
      <button onClick={this.retry}>Retry opening game</button>
    </div>;
    const Game = this.state.Game;
    // Commit the owner while its child loads, so retry state and the fallback's
    // deadline have an ordinary mount/unmount lifecycle. No successful-load delay.
    return <Suspense fallback={<CatMarioLoading onTimeout={this.timeout} />}>
      <Game {...this.props} />
    </Suspense>;
  }
}
const Premiere = lazy(() => import("./Premiere"));
const CodeWorkspace = lazy(() => import("./CodeWorkspace"));
const YouTubeStudio = lazy(() => import("./YouTubeStudio"));
import MailComposer from "./MailComposer";
import XcodeWorkspace from "./XcodeWorkspace";
import { Finder, Preview, Controls } from "./CareerApps";
function Contents({
  mail,
  setMail,
  sendMail,
  id,
  initialSection,
  open,
  navigate,
  onResume,
  enabled,
  notchScreen,
  onMaximize,
  maximized,
  onClose,
  gameEligible,
  claimOpeningFocus,
  gameLifecycle,
  sound,
}) {
  switch (id) {
    case "catmario":
      return <CatMarioBoundary claimOpeningFocus={claimOpeningFocus} gameEligible={gameEligible} gameLifecycle={gameLifecycle} sound={sound} onMaximize={onMaximize} maximized={maximized} />;
    case "finder":
      return <Finder open={open} onResume={onResume} initialSection={initialSection} />;
    case "preview":
      return <Preview />;
    case "mail":
      return (
        <MailComposer
          mail={mail}
          setMail={setMail}
          sendMail={sendMail}
          onClose={onClose}
        />
      );
    case "premiere":
      return (
        <Premiere
          enabled={enabled}
          onMaximize={onMaximize}
          maximized={maximized}
        />
      );
    case "vscode":
      return <CodeWorkspace navigate={navigate} />;
    case "xcode":
      return <XcodeWorkspace notchScreen={notchScreen} />;
    case "youtube":
      return <YouTubeStudio />;
    default:
      return <Controls />;
  }
}

export default function AppContents(props) {
  return (
    <Suspense
      fallback={
        <p className="app-loading" role="status">
          Opening application…
        </p>
      }
    >
      <Contents {...props} />
    </Suspense>
  );
}
