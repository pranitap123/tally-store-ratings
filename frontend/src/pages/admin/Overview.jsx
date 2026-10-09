import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Star, Store, Users } from 'lucide-react';
import { api } from '../../api/client.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { Tilt } from '../../components/ui/Tilt.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatRating } from '../../lib/format.js';

const STATS = [
  { key: 'users', label: 'Total users', icon: Users, tone: 'ink', to: '/admin/users' },
  { key: 'stores', label: 'Total stores', icon: Store, tone: 'accent', to: '/admin/stores' },
  { key: 'ratings', label: 'Ratings submitted', icon: Star, tone: 'star' },
];

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const rise = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      api.get('/admin/dashboard', { signal: ctrl.signal }),
      api.get('/admin/stores', { params: { sortBy: 'rating', order: 'desc', pageSize: 5 }, signal: ctrl.signal }),
    ])
      .then(([d, s]) => {
        setStats(d.data);
        setTop(s.data);
      })
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <PageHeader eyebrow="Admin" title={`Good to see you, ${user.name.split(' ')[0]}.`} lede="Here is how the platform looks right now." />

      {error && <p className="form__error">{error}</p>}

      <motion.div className="stat-grid" variants={grid} initial="hidden" animate="show">
        {STATS.map(({ key, label, icon: Icon, tone, to }) => (
          <motion.div key={key} variants={rise}>
            <Tilt className={`stat stat--${tone}`}>
              <div className="stat__icon">
                <Icon size={20} />
              </div>
              <p className="stat__label">{label}</p>
              <p className="stat__value">{stats ? <AnimatedNumber value={stats[key]} /> : <span className="skeleton" style={{ width: 90, height: 44 }} />}</p>
              {to && (
                <Link to={to} className="stat__link" aria-label={`Open ${label}`}>
                  View <ArrowUpRight size={14} />
                </Link>
              )}
            </Tilt>
          </motion.div>
        ))}
      </motion.div>

      <section className="panel">
        <div className="panel__head">
          <h3>Top rated stores</h3>
          <Link to="/admin/stores" className="text-link">
            All stores <ArrowUpRight size={14} />
          </Link>
        </div>
        <ol className="leaders">
          {(top ?? Array.from({ length: 5 })).map((s, i) => (
            <motion.li
              key={s?.id ?? i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {s ? (
                <>
                  <span className="leaders__rank">{i + 1}</span>
                  <div className="leaders__main">
                    <strong>{s.name}</strong>
                    <span>{s.address}</span>
                  </div>
                  <Stars value={s.rating ?? 0} size={15} />
                  <span className="leaders__score mono">{formatRating(s.rating)}</span>
                </>
              ) : (
                <span className="skeleton" style={{ height: 22, width: '100%' }} />
              )}
            </motion.li>
          ))}
          {top?.length === 0 && <li className="leaders__empty">No stores yet — add the first one.</li>}
        </ol>
      </section>
    </>
  );
}
