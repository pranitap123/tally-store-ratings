import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { BootScreen, GuestOnly, RequireAuth } from './components/layout/RouteGuards.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { homeFor } from './lib/format.js';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';

const Account = lazy(() => import('./pages/Account.jsx'));
const Overview = lazy(() => import('./pages/admin/Overview.jsx'));
const Users = lazy(() => import('./pages/admin/Users.jsx'));
const Stores = lazy(() => import('./pages/admin/Stores.jsx'));
const Discover = lazy(() => import('./pages/user/Discover.jsx'));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard.jsx'));

function Home() {
  const { user, booting } = useAuth();
  if (booting) return <BootScreen />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<BootScreen />}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/account" element={<Account />} />

            <Route element={<RequireAuth roles={['ADMIN']} />}>
              <Route path="/admin" element={<Overview />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/stores" element={<Stores />} />
            </Route>

            <Route element={<RequireAuth roles={['USER']} />}>
              <Route path="/stores" element={<Discover />} />
            </Route>

            <Route element={<RequireAuth roles={['STORE_OWNER']} />}>
              <Route path="/owner" element={<OwnerDashboard />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}
