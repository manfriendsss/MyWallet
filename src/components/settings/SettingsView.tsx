import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor, Download, RotateCcw, Eye, EyeOff, LogOut, Cloud, KeyRound, Fingerprint, Trash2, type LucideIcon } from 'lucide-react';
import { passkeyApi, passkeysSupported, type PasskeyInfo } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordForm } from '../auth/AuthScreens';
import type { SyncStatus } from '../../context/WalletContext';
import { Select } from '../ui/Select';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import type { AiProvider } from '../../types';
import { callGeminiApi, callDeepSeekApi } from '../../services/ai';
import { DEFAULT_AI_SETTINGS, SERVER_KEY } from '../../services/ai';
import { Stagger, StaggerItem } from '../ui/Stagger';
import { DataRecoveryRows } from './DataRecovery';

const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', hint: 'mới nhất, khuyên dùng' },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
];

const DEEPSEEK_MODEL_OPTIONS = [
  { value: 'deepseek-flash', label: 'DeepSeek V4.1 Flash', hint: 'khuyên dùng' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
];
import { toLocalISODate } from '../../utils/date';
import { cn } from '../../utils/cn';

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

const StatusLine: React.FC<{ status: Status }> = ({ status }) => (
  <p
    role="status"
    aria-live="polite"
    className={cn(
      'min-h-[1lh] text-sm font-semibold',
      status?.tone === 'ok' && 'text-income',
      status?.tone === 'error' && 'text-expense',
      status?.tone === 'info' && 'text-muted'
    )}
  >
    {status?.text}
  </p>
);

const KeyField: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}> = ({ id, label, value, placeholder, onChange }) => {
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
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn API key' : 'Hiện API key'}
          aria-pressed={visible}
          className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-control text-muted hover:text-ink transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

const SYNC_LABEL: Record<SyncStatus, { text: string; tone: string }> = {
  loading: { text: 'Đang tải dữ liệu…', tone: 'text-muted' },
  saving: { text: 'Đang lưu…', tone: 'text-muted' },
  saved: { text: 'Đã đồng bộ', tone: 'text-income' },
  error: { text: 'Chưa lưu được lên máy chủ, sẽ thử lại khi có thay đổi', tone: 'text-expense' },
  offline: { text: 'Ngoại tuyến, chỉ lưu trên máy này', tone: 'text-warn' },
};

/** Passkeys on this account: add one for this device, see and remove the others */
const PasskeySection: React.FC = () => {
  const [list, setList] = useState<PasskeyInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Status>(null);

  const refresh = () =>
    passkeyApi
      .list()
      .then(({ passkeys }) => setList(passkeys))
      .catch(() => setList([]));

  useEffect(() => {
    void refresh();
  }, []);

  if (!passkeysSupported()) return null;

  const add = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const device = /iphone|ipad/i.test(navigator.userAgent)
        ? 'iPhone / iPad'
        : /android/i.test(navigator.userAgent)
          ? 'Android'
          : /mac/i.test(navigator.userAgent)
            ? 'Mac'
            : /windows/i.test(navigator.userAgent)
              ? 'Windows'
              : 'Thiết bị này';
      await passkeyApi.register(device);
      setMessage({ tone: 'ok', text: 'Đã thêm. Lần sau đăng nhập bằng vân tay / Face ID.' });
      await refresh();
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'InvalidStateError') setMessage({ tone: 'info', text: 'Thiết bị này đã có passkey.' });
      else if (name !== 'NotAllowedError' && name !== 'AbortError')
        setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Không thêm được passkey.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await passkeyApi.remove(id).catch(() => undefined);
    await refresh();
  };

  return (
    <SettingRow
      icon={Fingerprint}
      title="Vân tay / Face ID"
      description="Đăng nhập không cần mật khẩu"
      action={
        <Button variant="outline" size="sm" onClick={add} isLoading={busy}>
          <span>Thêm</span>
        </Button>
      }
    >
      {list && list.length > 0 && (
        <ul className="mb-2 divide-y divide-rule rounded-control border border-rule">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <Fingerprint className="w-4 h-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name || 'Passkey'}</p>
                <p className="figure text-xs text-muted">Thêm ngày {formatDate(new Date(p.createdAt * 1000))}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(p.id)}
                aria-label={`Xóa passkey ${p.name || ''}`}
                className="grid h-9 w-9 place-items-center rounded-control text-muted hover:bg-expense-soft hover:text-expense transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <StatusLine status={message} />}
    </SettingRow>
  );
};

/**
 * One setting, laid out the same everywhere: icon, name and state on the left,
 * its one action on the right, anything it opens (a form, a list) underneath.
 */
const SettingRow: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  danger?: boolean;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, description, action, danger, children }) => (
  <div className="py-3 first:pt-0 last:pb-0">
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-control',
          danger ? 'bg-expense-soft text-expense' : 'bg-paper-2 text-muted'
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', danger ? 'text-expense' : 'text-ink')}>{title}</p>
        {description && <div className="text-xs text-muted">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children && <div className="mt-3">{children}</div>}
  </div>
);

const AccountCard: React.FC = () => {
  const { user } = useAuth();
  const { syncStatus } = useWallet();
  const [changing, setChanging] = useState(false);
  const [done, setDone] = useState(false);
  const sync = SYNC_LABEL[syncStatus];

  return (
    <Card aria-labelledby="account-heading">
      <CardHeader
        id="account-heading"
        title="Tài khoản"
        description={user ? `Đăng nhập: ${user.username}` : 'Chưa đăng nhập'}
      />
      <div className="divide-y divide-rule">
        <SettingRow
          icon={Cloud}
          title="Đồng bộ"
          description={
            <span className={cn('font-semibold', sync.tone)} role="status" aria-live="polite">
              {sync.text}
            </span>
          }
        />
        {user && (
          <SettingRow
            icon={KeyRound}
            title="Mật khẩu"
            description={done ? <span className="font-semibold text-income">Đã đổi mật khẩu.</span> : undefined}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setChanging((v) => !v);
                  setDone(false);
                }}
              >
                {changing ? 'Hủy' : 'Đổi'}
              </Button>
            }
          >
            {changing && (
              <ChangePasswordForm
                onDone={() => {
                  setChanging(false);
                  setDone(true);
                }}
              />
            )}
          </SettingRow>
        )}
        {user && <PasskeySection />}
      </div>
    </Card>
  );
};

export const SettingsView: React.FC = () => {
  const {
    aiSettings,
    updateAiSettings,
    exchangeRates,
    resetAllData,
    wallets,
    categories,
    transactions,
  } = useWallet();

  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  // AI Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState(aiSettings.geminiApiKey || '');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState(aiSettings.deepseekApiKey || '');
  const [provider, setProvider] = useState<AiProvider>(aiSettings.provider || 'gemini');
  const [geminiModel, setGeminiModel] = useState(aiSettings.geminiModel || DEFAULT_AI_SETTINGS.geminiModel);
  const [deepseekModel, setDeepseekModel] = useState(aiSettings.deepseekModel || DEFAULT_AI_SETTINGS.deepseekModel);
  const [rememberKeys, setRememberKeys] = useState(aiSettings.rememberKeys);
  const [keySource, setKeySource] = useState(aiSettings.keySource);

  const [aiStatus, setAiStatus] = useState<Status>(null);
  const [isTesting, setIsTesting] = useState(false);
  const flash = (setter: (s: Status) => void, status: Status, ms = 4000) => {
    setter(status);
    setTimeout(() => setter(null), ms);
  };

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    updateAiSettings({
      provider,
      geminiApiKey: geminiKeyInput.trim(),
      geminiModel,
      deepseekApiKey: deepseekKeyInput.trim(),
      deepseekModel,
      rememberKeys,
      keySource,
      // Moving keys to the server: nothing stays behind in this browser
      ...(keySource === 'server' ? { geminiApiKey: '', deepseekApiKey: '' } : {}),
    });
    if (keySource === 'server') {
      setGeminiKeyInput('');
      setDeepseekKeyInput('');
    }
    flash(setAiStatus, {
      tone: 'ok',
      text:
        keySource === 'server'
          ? 'Đã lưu. Trợ lý dùng key trên máy chủ Cloudflare, trình duyệt không giữ key nào.'
          : rememberKeys
            ? 'Đã lưu. Key được nhớ trên trình duyệt này.'
            : 'Đã lưu. Key sẽ bị xóa khi đóng tab.',
    });
  };

  const handleClearKeys = () => {
    setGeminiKeyInput('');
    setDeepseekKeyInput('');
    updateAiSettings({ geminiApiKey: '', deepseekApiKey: '' });
    flash(setAiStatus, { tone: 'ok', text: 'Đã xóa mọi API key khỏi trình duyệt.' });
  };

  const handleTestAi = async () => {
    setIsTesting(true);
    setAiStatus({ tone: 'info', text: 'Đang kiểm tra kết nối…' });
    try {
      const viaServer = keySource === 'server';
      if (provider === 'gemini') {
        if (!viaServer && !geminiKeyInput.trim()) throw new Error('Nhập Gemini API key trước.');
        await callGeminiApi(viaServer ? SERVER_KEY : geminiKeyInput.trim(), geminiModel, 'Ăn bún bò 50k', categories, wallets);
        setAiStatus({ tone: 'ok', text: 'Kết nối Gemini thành công.' });
      } else {
        if (!viaServer && !deepseekKeyInput.trim()) throw new Error('Nhập DeepSeek API key trước.');
        await callDeepSeekApi(viaServer ? SERVER_KEY : deepseekKeyInput.trim(), deepseekModel, 'Ăn bún bò 50k', categories, wallets);
        setAiStatus({ tone: 'ok', text: 'Kết nối DeepSeek thành công.' });
      }
    } catch (err) {
      setAiStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Không thể kết nối.' });
    } finally {
      setIsTesting(false);
    }
  };

  // Export Data JSON
  const handleExportData = () => {
    const data = {
      wallets,
      categories,
      transactions,
      exchangeRates,
      exportedAt: new Date().toISOString(),
      app: 'MyWallet',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mywallet-backup-${toLocalISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stagger className="mx-auto max-w-3xl space-y-6">
      {/* Most used first, destructive last: account, look, assistant, data, sign out */}
      <StaggerItem>
        <AccountCard />
      </StaggerItem>

      <StaggerItem>
      <Card aria-labelledby="theme-heading">
        <CardHeader id="theme-heading" title="Giao diện" />
        <div className="seg" role="group" aria-label="Chế độ giao diện">
          {[
            { id: 'light' as const, label: 'Sáng', Icon: Sun },
            { id: 'dark' as const, label: 'Tối', Icon: Moon },
            { id: 'system' as const, label: 'Hệ thống', Icon: Monitor },
          ].map(({ id, label, Icon }) => (
            <button key={id} type="button" aria-pressed={theme === id} onClick={() => setTheme(id)} className="inline-flex items-center justify-center gap-2">
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </Card>
      </StaggerItem>

      <StaggerItem>
      <Card aria-labelledby="ai-heading">
        <CardHeader
          id="ai-heading"
          title="Trợ lý AI"
        />

        <form onSubmit={handleSaveAi} className="space-y-5 border-t border-rule pt-5">
          <fieldset>
            <legend className="label">Nhà cung cấp</legend>
            <div className="seg" role="group" aria-label="Nhà cung cấp AI">
              <button type="button" aria-pressed={provider === 'gemini'} onClick={() => setProvider('gemini')}>
                Google Gemini
              </button>
              <button type="button" aria-pressed={provider === 'deepseek'} onClick={() => setProvider('deepseek')}>
                DeepSeek
              </button>
            </div>
            <p className="hint">
              {provider === 'gemini'
                ? 'Hiểu cả chữ lẫn ảnh hóa đơn.'
                : 'Chỉ hiểu chữ, chi phí thấp. Ảnh hóa đơn cần Gemini.'}
            </p>
          </fieldset>

          <fieldset>
            <legend className="label">Nơi giữ API key</legend>
            <div className="seg" role="group" aria-label="Nơi giữ API key">
              <button type="button" aria-pressed={keySource === 'server'} onClick={() => setKeySource('server')}>
                Máy chủ Cloudflare
              </button>
              <button type="button" aria-pressed={keySource === 'browser'} onClick={() => setKeySource('browser')}>
                Trình duyệt này
              </button>
            </div>
            <p className="hint">
              {keySource === 'server'
                ? 'An toàn nhất: key là bí mật trên Cloudflare, trình duyệt không bao giờ thấy. Chỉ tài khoản đã đăng nhập mới gọi được.'
                : 'Key lưu trên máy này, không mã hóa. Chỉ nên dùng khi chưa cài máy chủ.'}
            </p>
          </fieldset>

          {provider === 'gemini' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {keySource === 'browser' && (
                <KeyField id="gemini-key" label="Gemini API key" placeholder="AIza…" value={geminiKeyInput} onChange={setGeminiKeyInput} />
              )}
              <div>
                <label htmlFor="gemini-model" className="label">
                  Model
                </label>
                <Select id="gemini-model" value={geminiModel} onChange={setGeminiModel} options={GEMINI_MODEL_OPTIONS} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {keySource === 'browser' && (
                <KeyField id="deepseek-key" label="DeepSeek API key" placeholder="sk-…" value={deepseekKeyInput} onChange={setDeepseekKeyInput} />
              )}
              <div>
                <label htmlFor="deepseek-model" className="label">
                  Model
                </label>
                <Select id="deepseek-model" value={deepseekModel} onChange={setDeepseekModel} options={DEEPSEEK_MODEL_OPTIONS} />
              </div>
            </div>
          )}

          {/* Where the key lives: said plainly */}
          {keySource === 'browser' && (
          <div className="rounded-control bg-paper-2 p-4">
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                name="rememberKeys"
                checked={rememberKeys}
                onChange={(e) => setRememberKeys(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="font-semibold">Ghi nhớ key trên trình duyệt này</span>
                <span className="mt-1 block text-muted">
                  Key không được mã hóa. Tắt mục này thì key chỉ giữ tới khi đóng tab. Key được gửi thẳng tới Google hoặc
                  DeepSeek, không qua máy chủ nào khác. Nên đặt giới hạn chi tiêu cho key và không bật trên máy dùng chung.
                </span>
              </span>
            </label>
          </div>
          )}

          <StatusLine status={aiStatus} />

          {/* Save and test side by side; clearing keys sits apart, below */}
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" variant="primary">
              Lưu
            </Button>
            <Button variant="outline" onClick={handleTestAi} isLoading={isTesting}>
              Kiểm tra
            </Button>
            {(aiSettings.geminiApiKey || aiSettings.deepseekApiKey) && (
              <Button variant="ghost" onClick={handleClearKeys} className="col-span-2 text-expense">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Xóa mọi key khỏi trình duyệt</span>
              </Button>
            )}
          </div>
        </form>
      </Card>
      </StaggerItem>

      <StaggerItem>
      <Card aria-labelledby="data-heading">
        <CardHeader
          id="data-heading"
          title="Dữ liệu"
          description="Lưu trên máy chủ (Cloudflare D1), đồng bộ giữa các thiết bị."
        />
        <div className="divide-y divide-rule">
          <SettingRow
            icon={Download}
            title="Sao lưu"
            description="Tải một bản JSON để giữ riêng"
            action={
              <Button variant="outline" size="sm" onClick={handleExportData}>
                Tải về
              </Button>
            }
          />
          <DataRecoveryRows Row={SettingRow} />
          <SettingRow
            icon={RotateCcw}
            danger
            title="Xóa toàn bộ dữ liệu"
            description="Ví và giao dịch; vẫn khôi phục được trong Lịch sử thay đổi"
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      'Xóa toàn bộ ví và giao dịch, trên máy này và trên máy chủ? Danh mục trở về mặc định.\n\nNếu đổi ý, vào Lịch sử thay đổi để khôi phục.'
                    )
                  ) {
                    resetAllData();
                  }
                }}
              >
                Xóa
              </Button>
            }
          />
        </div>
      </Card>
      </StaggerItem>

      {user && (
        <StaggerItem>
          <Button variant="outline" onClick={() => void logout()} className="w-full">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Đăng xuất</span>
          </Button>
        </StaggerItem>
      )}
    </Stagger>
  );
};
