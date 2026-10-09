import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search } from 'lucide-react';
import { api } from '../../api/client.js';
import { Button } from '../../components/ui/Button.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { SelectField, TextArea, TextField } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PasswordMeter } from '../../components/ui/PasswordMeter.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useList } from '../../hooks/useList.js';
import { applyServerErrors } from '../../lib/forms.js';
import { ROLE_LABEL, formatDate, formatRating, initials } from '../../lib/format.js';
import { createUserSchema } from '../../lib/validation.js';

const FIELDS = ['name', 'email', 'address', 'password', 'role'];

function RoleBadge({ role }) {
  return <span className={`badge badge--${role.toLowerCase()}`}>{ROLE_LABEL[role]}</span>;
}

function AddUserForm({ onDone }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', address: '', password: '', role: 'USER' },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = async (values) => {
    try {
      await api.post('/admin/users', values);
      toast.success('User created');
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError, FIELDS)) toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="form form--modal">
      <TextField label="Full name" hint="20–60 characters" error={errors.name?.message} {...register('name')} />
      <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <TextArea label="Address" error={errors.address?.message} {...register('address')} />
      <SelectField label="Role" error={errors.role?.message} {...register('role')}>
        <option value="USER">Customer</option>
        <option value="STORE_OWNER">Store owner</option>
        <option value="ADMIN">Administrator</option>
      </SelectField>
      <TextField label="Temporary password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <PasswordMeter value={password} />
      <div className="form__actions">
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create user
        </Button>
      </div>
    </form>
  );
}

function UserDetail({ id }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/admin/users/${id}`)
      .then((r) => setUser(r.data))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="form__error">{error}</p>;
  if (!user) return <span className="skeleton" style={{ height: 120, width: '100%' }} />;

  return (
    <div className="detail">
      <div className="detail__head">
        <span className="avatar avatar--lg">{initials(user.name)}</span>
        <div>
          <h3>{user.name}</h3>
          <RoleBadge role={user.role} />
        </div>
      </div>
      <dl className="detail__list">
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{user.address}</dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        {user.role === 'STORE_OWNER' && (
          <>
            <div>
              <dt>Store</dt>
              <dd>{user.storeName ?? 'No store assigned yet'}</dd>
            </div>
            <div>
              <dt>Store rating</dt>
              <dd className="detail__rating">
                {user.rating != null ? (
                  <>
                    <Stars value={user.rating} size={18} /> <strong className="mono">{formatRating(user.rating)}</strong>
                  </>
                ) : (
                  'Not rated yet'
                )}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}

export default function Users() {
  const list = useList('/admin/users', { defaultSort: 'name', initialFilters: { name: '', email: '', address: '', role: '' } });
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);

  const closeAdd = useCallback(() => setAdding(false), []);
  const { reload } = list;
  const afterAdd = useCallback(() => {
    setAdding(false);
    reload();
  }, [reload]);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      render: (u) => (
        <span className="cell-person">
          <span className="avatar avatar--sm">{initials(u.name)}</span>
          {u.name}
        </span>
      ),
    },
    { key: 'email', header: 'Email', sortKey: 'email' },
    { key: 'address', header: 'Address', sortKey: 'address', className: 'cell-wide' },
    { key: 'role', header: 'Role', sortKey: 'role', render: (u) => <RoleBadge role={u.role} /> },
    {
      key: 'rating',
      header: 'Rating',
      render: (u) => (u.role === 'STORE_OWNER' ? (u.rating != null ? <span className="mono">★ {formatRating(u.rating)}</span> : <span className="muted">—</span>) : null),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        lede="Customers, store owners and administrators. Click a row for the full profile."
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Add user
          </Button>
        }
      />

      <div className="filters">
        {['name', 'email', 'address'].map((f) => (
          <label key={f} className="filter">
            <Search size={15} />
            <span className="sr-only">Filter by {f}</span>
            <input value={list.filters[f]} onChange={(e) => list.setFilter(f, e.target.value)} placeholder={`Filter by ${f}`} />
          </label>
        ))}
        <label className="filter filter--select">
          <span className="sr-only">Filter by role</span>
          <select value={list.filters.role} onChange={(e) => list.setFilter('role', e.target.value)}>
            <option value="">All roles</option>
            <option value="USER">Customers</option>
            <option value="STORE_OWNER">Store owners</option>
            <option value="ADMIN">Administrators</option>
          </select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSort={list.toggleSort}
        meta={list.meta}
        onPage={list.setPage}
        onRowClick={(u) => setViewing(u.id)}
        empty="No users match those filters."
      />

      <Modal open={adding} onClose={closeAdd} title="Add a user">
        <AddUserForm onDone={afterAdd} />
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="User profile">
        {viewing && <UserDetail id={viewing} />}
      </Modal>
    </>
  );
}
