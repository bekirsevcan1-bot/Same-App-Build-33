import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import Home from "./pages/Home";
import Register from "./pages/Register";
import Support from "./pages/Support";
import Privacy from "./pages/Privacy";
import Ustas from "./pages/Ustas";
import Pay from "./pages/Pay";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();
function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/kayit" component={Register} />
        <Route path="/destek" component={Support} />
        <Route path="/gizlilik" component={Privacy} />
        <Route path="/ustalar" component={Ustas} />
        <Route path="/pay" component={Pay} />
        <Route path="/admin" component={Admin} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
