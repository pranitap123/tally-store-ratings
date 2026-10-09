import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, LayoutDashboard, LogOut, Menu, Store, Users, X, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL, initials } from '../../lib/format.js';
import { Logo } from '../ui/Logo.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';

const NAV = {
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/stores', label: 'Stores', icon: Store },
  ],
  USER: [{ to: '/stores', label: 'Discover', icon: Store }],
  STORE_OWNER: [{ to: '/owner', label: 'My store', icon: Star, end: true }],
};

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  // the drawer belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === location.pathname;
  const setOpen = (v) => setOpenOn(v ? location.pathname : null);

  const links = [...NAV[user.role], { to: '/account', label: 'Password', icon: KeyRound }];

  const sidebar = (
    <div className="side__inner">
      <div className="side__brand">
        <Logo />
        <ThemeToggle />
      </div>

      <nav className="side__nav" aria-label="Main">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="side__link">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-pill" className="side__pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon size={18} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="side__user">
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div className="side__who">
          <strong title={user.name}>{user.name}</strong>
          <span>{ROLE_LABEL[user.role]}</span>
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="shell">
      <aside className="side">{sidebar}</aside>

      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Logo size={28} />
        <ThemeToggle />
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="side side--drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <button className="icon-btn drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
