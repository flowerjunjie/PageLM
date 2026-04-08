import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";
import { CompanionProvider } from "./components/Companion/CompanionProvider";
import CompanionDock from "./components/Companion/CompanionDock";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/config";
import Onboarding from "./components/Onboarding";
import ShortcutHelp from "./components/ShortcutHelp";
import { ToastProvider } from "./components/Toast";
import packageJson from "../package.json";

export default function App() {
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Check for Ctrl/Cmd + K to focus input
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
          }
        }
        return;
      }

      // ? key to open shortcut help
      if (e.key === "?" && !e.shiftKey) {
        e.preventDefault();
        setIsShortcutHelpOpen(true);
        return;
      }

      // Ctrl/Cmd + K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
        return;
      }

      // Escape to close modals
      if (e.key === "Escape") {
        setIsShortcutHelpOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <CompanionProvider>
          <div className="bg-black text-stone-300 min-h-screen flex flex-col">
            <Sidebar />
            <div className="flex-1 relative">
              <Outlet />
            </div>
            {/* Version badge - bottom left */}
            <div className="fixed bottom-2 left-2 text-xs text-stone-600 hover:text-stone-500 z-50">
              v{packageJson.version}
            </div>
          </div>
          <CompanionDock />
          <Onboarding />
          <ShortcutHelp isOpen={isShortcutHelpOpen} onClose={() => setIsShortcutHelpOpen(false)} />
        </CompanionProvider>
      </ToastProvider>
    </I18nextProvider>
  );
}
