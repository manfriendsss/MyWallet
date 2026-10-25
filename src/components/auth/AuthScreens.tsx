import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, KeyRound, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

/** Shared frame: centred card on the ambient page, the logo above it */
const AuthFrame: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="relative flex min-h-dvh items-center justify-center bg-paper px-4 py-10 text-ink">
    <div className="ambient" aria-hidden="true" />
    <main className="relative z-[1] w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/logo.webp" alt="" width={72} height={72} className="h-18 w-18 object-contain drop-shadow-[0_10px_18px_var(--color-glow-1)]" />
        <p className="mt-3 text-xl font-bold">MyWallet</p>
      </div>
      <section className="rounded-card border border-rule bg-surface p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </section>
    </main>
  </div>
);

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
  invalid?: boolean;
}> = ({ id, label, value, onChange, autoComplete, autoFocus, invalid }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-control text-muted hover:text-ink transition-colors"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

const ErrorLine: React.FC<{ message: string | null }> = ({ message }) => (
  <p role="alert" className={cn('min-h-[1lh] text-sm font-semibold text-expense', !message && 'invisible')}>
    {message}
  </p>
);

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Đăng nhập">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-username" className="label">
            Tên đăng nhập
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="field"
          />
        </div>
        <PasswordField
          id="login-password"
          label="Mật khẩu"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          invalid={!!error}
        />
        <ErrorLine message={error} />
        <Button type="submit" variant="primary" isLoading={busy} disabled={!username.trim() || !password} className="w-full">
          {!busy && <LogIn className="h-4 w-4" aria-hidden="true" />}
          <span>Đăng nhập</span>
        </Button>
        <p className="text-center text-xs text-muted">Thiết bị này sẽ nhớ đăng nhập trong 180 ngày.</p>
      </form>
    </AuthFrame>
  );
};

/** Change-password form; used at first login and from Settings */
export const ChangePasswordForm: React.FC<{ onDone?: () => void; firstLogin?: boolean }> = ({ onDone, firstLogin }) => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError('Mật khẩu mới cần ít nhất 8 ký tự.');
    if (next !== confirm) return setError('Hai lần nhập mật khẩu mới không khớp.');
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Lets password managers attach the new password to the right account */}
      <input type="text" name="username" autoComplete="username" value="manfriends" readOnly hidden />
      <PasswordField
        id="pw-current"
        label={firstLogin ? 'Mật khẩu hiện tại (mặc định)' : 'Mật khẩu hiện tại'}
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        autoFocus={firstLogin}
      />
      <PasswordField id="pw-new" label="Mật khẩu mới" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordField id="pw-confirm" label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <p className="hint">Ít nhất 8 ký tự. Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.</p>
      <ErrorLine message={error} />
      <Button type="submit" variant="primary" isLoading={busy} disabled={!current || !next || !confirm} className="w-full">
        {!busy && <KeyRound className="h-4 w-4" aria-hidden="true" />}
        <span>Đổi mật khẩu</span>
      </Button>
    </form>
  );
};

export const FirstPasswordScreen: React.FC = () => {
  const { logout } = useAuth();
  return (
    <AuthFrame title="Đặt mật khẩu mới" subtitle="Bạn đang dùng mật khẩu mặc định. Hãy đổi trước khi vào app.">
      <ChangePasswordForm firstLogin />
      <button type="button" onClick={() => void logout()} className="mt-4 w-full text-center text-sm text-muted hover:text-ink">
        Đăng xuất
      </button>
    </AuthFrame>
  );
};

export const OfflineNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="relative z-[310] flex items-center justify-center gap-2 bg-paper-3 px-4 py-2 text-sm text-ink-2">
    <WifiOff className="h-4 w-4" aria-hidden="true" />
    <span>Đang ngoại tuyến: dữ liệu trên máy này chưa đồng bộ.</span>
    <button type="button" onClick={onRetry} className="font-semibold text-accent hover:underline">
      Thử lại
    </button>
  </div>
);
