import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Library from "./pages/Library";
import ArticleDetail from "./pages/ArticleDetail";
import IdeaGenerator from "./pages/IdeaGenerator";
import ContentCalendar from "./pages/ContentCalendar";
import EmailInbox from "./pages/EmailInbox";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Library} />
        <Route path={"/library"} component={Library} />
        <Route path={"/article/:id"} component={ArticleDetail} />
        <Route path={"/ideas"} component={IdeaGenerator} />
        <Route path={"/calendar"} component={ContentCalendar} />
        <Route path={"/inbox"} component={EmailInbox} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
