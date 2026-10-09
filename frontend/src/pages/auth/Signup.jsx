import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '../../components/layout/AuthLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextArea, TextField } from '../../components/ui/Field.jsx';
import { PasswordMeter } from '../../components/ui/PasswordMeter.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyServerErrors } from '../../lib/forms.js';
import { homeFor } from '../../lib/format.js';
import { signupSchema } from '../../lib/validation.js';

const FIELDS = ['name', 'email', 'address', 'password'];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', address: '', password: '' },
  });

  const password = useWatch({ control, name: 'password' });
  const nameLen = useWatch({ control, name: 'name' }).trim().length;

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const user = await signup(values);
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError, FIELDS)) setFormError(err.message);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Takes a minute. Then you can rate any store on Tally."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
        <TextField
          label="Full name"
          autoComplete="name"
          hint={`${nameLen}/60 · at least 20 characters`}
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextArea label="Address" autoComplete="street-address" error={errors.address?.message} {...register('address')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordMeter value={password} />
        {formError && (
          <p className="form__error" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
