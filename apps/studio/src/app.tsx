import { useEffect } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import { StudioProvider } from "@studio/providers/studio-context";
import { ToastProvider } from "@studio/providers/toast-provider";
import { AppShell } from "@studio/components/layout/app-shell";
import { DashboardPage } from "@studio/pages/dashboard";
import { PostEditorPage } from "@studio/pages/post-editor";
import { BookmarksPage } from "@studio/pages/bookmarks";
import { SettingsPage } from "@studio/pages/settings";
import { OnboardingPage } from "@studio/pages/onboarding";

function KeyboardShortcuts() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      const routes: Record<string, string> = { "1": "/", "2": "/post", "3": "/bookmarks", "4": "/settings" };
      const route = routes[e.key];
      if (route) {
        e.preventDefault();
        setLocation(route);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);

  return null;
}

function App() {
  return (
    <Router hook={useHashLocation}>
      <ToastProvider>
        <StudioProvider>
          <KeyboardShortcuts />
          <Switch>
            <Route path="/onboarding" component={OnboardingPage} />
            <Route>
              <AppShell>
                <Switch>
                  <Route path="/" component={DashboardPage} />
                  <Route path="/post" component={PostEditorPage} />
                  <Route path="/bookmarks" component={BookmarksPage} />
                  <Route path="/settings" component={SettingsPage} />
                  <Route>
                    <DashboardPage />
                  </Route>
                </Switch>
              </AppShell>
            </Route>
          </Switch>
        </StudioProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
