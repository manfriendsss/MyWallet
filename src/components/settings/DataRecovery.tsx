import React, { useRef, useState } from 'react';
import { History, Upload } from 'lucide-react';
import { dataApi, type DataVersion } from '../../services/api';
import { useWallet } from '../../context/WalletContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const KEY_LABEL: Record<DataVersion['key'], string> = {
  transactions: 'Giao dịch',
  wallets: 'Nguồn tiền',
  categories: 'Danh mục',
};

const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function describeRestored(restored: Partial<Record<DataVersion['key'], number>>): string {
  const parts = (Object.keys(restored) as DataVersion['key'][])
    .filter((key) => (restored[key] ?? 0) > 0)
    .map((key) => `${restored[key]} ${KEY_LABEL[key].toLowerCase()}`);
  return parts.length ? `Đã khôi phục ${parts.join(', ')}.` : 'Không thiếu gì: mọi mục trong bản này đều đang có.';
}

/**
 * Rows for the Settings "Dữ liệu" card: browse saved versions and bring back anything missing,
 * or restore from a downloaded backup file. Restoring only adds back what is missing now.
 */
export const DataRecoveryRows: React.FC<{ Row: React.FC<{ icon: typeof History; title: string; description?: React.ReactNode; action?: React.ReactNode }> }> = ({ Row }) => {
  const { refreshAll } = useWallet();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<DataVersion[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | 'file' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openHistory = async () => {
    setIsOpen(true);
    setError('');
    setVersions(null);
    try {
      const { versions: list } = await dataApi.history();
      setVersions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa đọc được lịch sử.');
    }
  };

  const restore = async (source: { id: number } | { docs: Record<string, unknown> }, busy: number | 'file') => {
    setBusyId(busy);
    try {
      const { restored } = await dataApi.restore(source);
      await refreshAll();
      showToast({ message: describeRestored(restored) });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Không khôi phục được.' });
    } finally {
      setBusyId(null);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const source = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      const docs = { wallets: source?.wallets, categories: source?.categories, transactions: source?.transactions };
      if (![docs.wallets, docs.categories, docs.transactions].some(Array.isArray)) throw new Error();
      await restore({ docs }, 'file');
    } catch {
      showToast({ message: 'File không phải bản sao lưu MyWallet.' });
    }
  };

  // Newest first, grouped by day
  const groups: Array<{ day: string; items: DataVersion[] }> = [];
  for (const version of versions ?? []) {
    const day = dayLabel(version.savedAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(version);
    else groups.push({ day, items: [version] });
  }

  return (
    <>
      <Row
        icon={History}
        title="Lịch sử thay đổi"
        description="Máy chủ giữ các bản cũ, khôi phục bất cứ lúc nào"
        action={
          <Button variant="outline" size="sm" onClick={() => void openHistory()}>
            Xem
          </Button>
        }
      />
      <Row
        icon={Upload}
        title="Khôi phục từ file"
        description="Đưa lại các mục từ một bản sao lưu đã tải"
        action={
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e)} />
            <Button variant="outline" size="sm" disabled={busyId === 'file'} onClick={() => fileRef.current?.click()}>
              {busyId === 'file' ? 'Đang khôi phục…' : 'Chọn file'}
            </Button>
          </>
        }
      />

      <Modal
        variant="drawer"
        maxWidth="sm:max-w-md"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Lịch sử thay đổi"
        description="Khôi phục chỉ thêm lại những mục bản đó có mà hiện tại thiếu; không xóa hay ghi đè gì."
      >
        {error ? (
          <p className="py-8 text-center text-sm text-expense">{error}</p>
        ) : versions === null ? (
          <p className="py-8 text-center text-sm text-muted">Đang tải…</p>
        ) : versions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Chưa có bản lưu nào. Mỗi lần dữ liệu thay đổi, bản trước đó sẽ được giữ lại ở đây.</p>
        ) : (
          <div className="-mx-5 -mt-5 sm:-mx-6">
            {groups.map((group) => (
              <section key={group.day}>
                <h3 className="sticky top-0 z-10 border-b border-rule bg-surface/95 px-5 py-2 text-sm font-semibold capitalize text-ink backdrop-blur sm:px-6">
                  {group.day}
                </h3>
                <ul className="divide-y divide-rule px-5 sm:px-6">
                  {group.items.map((version) => (
                    <li key={version.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">
                          {KEY_LABEL[version.key]}
                          {version.count !== null && <span className="font-normal text-muted"> · {version.count} mục</span>}
                        </p>
                        <p className="text-xs text-muted">Bản lúc {timeLabel(version.savedAt)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void restore({ id: version.id }, version.id)}
                      >
                        {busyId === version.id ? 'Đang…' : 'Khôi phục'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};
