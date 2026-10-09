import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search } from 'lucide-react';
import { api } from '../../api/client.js';
import { Button } from '../../components/ui/Button.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { SelectField, TextArea, TextField } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useList } from '../../hooks/useList.js';
import { applyServerErrors } from '../../lib/forms.js';
import { formatRating } from '../../lib/format.js';
import { createStoreSchema } from '../../lib/validation.js';

const FIELDS = ['name', 'email', 'address', 'ownerId'];

function AddStoreForm({ onDone }) {
  const toast = useToast();
  const [owners, setOwners] = useState([]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createStoreSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', address: '', ownerId: '' },
  });

  useEffect(() => {
    api
      .get('/admin/store-owners')
      .then((r) => setOwners(r.data))
      .catch(() => {});
  }, []);

  const onSubmit = async ({ ownerId, ...rest }) => {
    try {
      await api.post('/admin/stores', { ...rest, ownerId: ownerId || null });
      toast.success('Store added');
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError, FIELDS)) toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="form form--modal">
      <TextField label="Store name" hint="20–60 characters" error={errors.name?.message} {...register('name')} />
      <TextField label="Contact email" type="email" error={errors.email?.message} {...register('email')} />
      <TextArea label="Address" error={errors.address?.message} {...register('address')} />
      <SelectField
        label="Owner"
        hint={owners.length ? 'Optional — only owners without a store are listed' : 'No unassigned store owners yet. Create one under Users first.'}
        error={errors.ownerId?.message}
        {...register('ownerId')}
      >
        <option value="">No owner yet</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} — {o.email}
          </option>
        ))}
      </SelectField>
      <div className="form__actions">
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Add store
        </Button>
      </div>
    </form>
  );
}

export default function Stores() {
  const list = useList('/admin/stores', { defaultSort: 'name', initialFilters: { name: '', email: '', address: '' } });
  const [adding, setAdding] = useState(false);

  const closeAdd = useCallback(() => setAdding(false), []);
  const { reload } = list;
  const afterAdd = useCallback(() => {
    setAdding(false);
    reload();
  }, [reload]);

  const columns = [
    { key: 'name', header: 'Name', sortKey: 'name', render: (s) => <strong>{s.name}</strong> },
    { key: 'email', header: 'Email', sortKey: 'email' },
    { key: 'address', header: 'Address', sortKey: 'address', className: 'cell-wide' },
    { key: 'owner', header: 'Owner', render: (s) => s.ownerName ?? <span className="muted">Unassigned</span> },
    {
      key: 'rating',
      header: 'Rating',
      sortKey: 'rating',
      render: (s) =>
        s.rating != null ? (
          <span className="cell-rating">
            <Stars value={s.rating} size={14} />
            <span className="mono">{formatRating(s.rating)}</span>
            <span className="muted mono">({s.ratingCount})</span>
          </span>
        ) : (
          <span className="muted">No ratings</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Stores"
        lede="Every store on the platform with its live average rating."
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Add store
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
        empty="No stores match those filters."
      />

      <Modal open={adding} onClose={closeAdd} title="Add a store">
        <AddStoreForm onDone={afterAdd} />
      </Modal>
    </>
  );
}
