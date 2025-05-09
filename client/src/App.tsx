import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Revenues from "@/pages/revenues";
import Associates from "@/pages/associates";
import Expenses from "@/pages/expenses";
import Distribution from "@/pages/distribution";
import Settings from "@/pages/settings";
import RcpMeetings from "@/pages/rcp-meetings";
import Projects from "@/pages/projects";
import ApiTest from "@/pages/api-test";
import AppShell from "@/components/layout/app-shell";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/revenues" component={Revenues} />
      <Route path="/associates" component={Associates} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/rcp-meetings" component={RcpMeetings} />
      <Route path="/projects" component={Projects} />
      <Route path="/distribution" component={Distribution} />
      <Route path="/settings" component={Settings} />
      <Route path="/api-test" component={ApiTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppShell>
          <Router />
        </AppShell>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
