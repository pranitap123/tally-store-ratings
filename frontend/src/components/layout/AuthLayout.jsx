import { lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';

const HeroScene = lazy(() => import('../scene/HeroScene.jsx'));

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export function AuthLayout({ title, subtitle, children, footer }) {
  const reduce = useReducedMotion();

  return (
    <div className="auth">
      <aside className="auth__stage">
        <div className="auth__glow" aria-hidden="true" />
        {!reduce && (
          <div className="auth__canvas">
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </div>
        )}
        <Link to="/login" className="auth__brand" aria-label="Tally home">
          <Logo />
        </Link>
        <motion.div className="auth__copy" variants={container} initial="hidden" animate="show">
          <motion.h2 variants={item}>
            Ratings you can
            <br />
            <em>actually</em> trust.
          </motion.h2>
          <motion.p variants={item}>
            Find the stores worth your time, and tell everyone else what you really thought.
          </motion.p>
          <motion.ul variants={item} className="auth__facts">
            <li>
              <strong>1–5</strong> one honest score per store
            </li>
            <li>
              <strong>Live</strong> averages update as you rate
            </li>
          </motion.ul>
        </motion.div>
      </aside>

      <main className="auth__panel">
        <div className="auth__top">
          <Link to="/login" className="auth__brand-mobile" aria-label="Tally home">
            <Logo size={30} />
          </Link>
          <ThemeToggle />
        </div>
        <motion.div
          className="auth__card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <h1>{title}</h1>
          <p className="auth__sub">{subtitle}</p>
          {children}
          <p className="auth__footer">{footer}</p>
        </motion.div>
      </main>
    </div>
  );
}
