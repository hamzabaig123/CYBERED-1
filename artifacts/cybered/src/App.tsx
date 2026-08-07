import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';

import Login from '@/pages/login';
import Register from '@/pages/register';
import ForgotPassword from '@/pages/forgot-password';
import ResetPassword from '@/pages/reset-password';
import VerifyEmail from '@/pages/verify-email';
import Dashboard from '@/pages/dashboard';
import Admin from '@/pages/admin';
import Curriculum from '@/pages/curriculum';
import Search from '@/pages/search';
import Tests from '@/pages/tests';
import TestView from '@/pages/test-view';
import QuestionEdit from '@/pages/question-edit';
import Security from '@/pages/security';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-black text-primary font-mono p-8 crt-overlay flex items-center justify-center animate-pulse">AUTHORIZING...</div>;
  }
  
  if (!user) {
    return <Login />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Dashboard />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/security"><ProtectedRoute component={Security} /></Route>
      <Route path="/admin"><ProtectedRoute component={Admin} adminOnly /></Route>
      <Route path="/curriculum"><ProtectedRoute component={Curriculum} /></Route>
      <Route path="/questions/new"><ProtectedRoute component={QuestionEdit} /></Route>
      <Route path="/questions/:id"><ProtectedRoute component={QuestionEdit} /></Route>
      <Route path="/search"><ProtectedRoute component={Search} /></Route>
      <Route path="/tests"><ProtectedRoute component={Tests} /></Route>
      <Route path="/tests/:id"><ProtectedRoute component={TestView} /></Route>
      
      <Route>
        <div className="min-h-screen bg-black text-primary font-mono flex items-center justify-center flex-col gap-4 crt-overlay">
          <h1 className="text-4xl font-bold uppercase tracking-widest">404</h1>
          <p className="tracking-widest">Sector Not Found</p>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
