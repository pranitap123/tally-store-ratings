import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../api/client.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { PasswordMeter } from '../components/ui/PasswordMeter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { applyServerErrors } from '../lib/forms.js';
import { ROLE_LABEL } from '../lib/format.js';
import { changePasswordSchema } from '../lib/validation.js';

export default function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const newPassword = useWatch({ control, name: 'newPassword' });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated');
      reset();
    } catch (err) {
      if (!applyServerErrors(err, setError, ['currentPassword', 'newPassword'])) toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Password & security" lede={`Signed in as ${user.email} · ${ROLE_LABEL[user.role]}`} />
      <section className="panel panel--narrow">
        <h3>Change password</h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordMeter value={newPassword} />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </section>
    </>
  );
}
