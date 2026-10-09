import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/format.js';

export function BootScreen() {
  return (
    <div className="boot" role="status" aria-label="Loading">
      <span className="boot__star" />
    </div>
  );
}

/** Signed-in users only; optionally restricted to given roles (others are sent to their own home). */
export function RequireAuth({ roles }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <BootScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

/** Login/signup pages bounce signed-in users to their home. */
export function GuestOnly() {
  const { user, booting } = useAuth();
  if (booting) return <BootScreen />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
