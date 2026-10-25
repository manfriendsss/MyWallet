import React, { useState } from 'react';
import {
  Moon,
  Sun,
  RefreshCw,
  Coins,
  ShieldCheck,
  Download,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { AiProvider } from '../../types';
import { callGeminiApi, callDeepSeekApi } from '../../services/ai';

export const SettingsView: React.FC = () => {
  const {
    aiSettings,
    updateAiSettings,
    exchangeRates,
    updateExchangeRates,
    refreshExchangeRates,
    resetAllData,
    wallets,
    categories,
    transactions,
  } = useWallet();

  const { theme, setTheme } = useTheme();

  // AI Key state
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(aiSettings.geminiApiKey || '');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState(aiSettings.deepseekApiKey || '');
  const [provider, setProvider] = useState<AiProvider>(aiSettings.provider || 'gemini');
  const [geminiModel, setGeminiModel] = useState(aiSettings.geminiModel || 'gemini-2.5-flash');
  const [deepseekModel, setDeepseekModel] = useState(aiSettings.deepseekModel || 'deepseek-chat');

  // Test status
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [ratesSuccessMsg, setRatesSuccessMsg] = useState(false);

  // Exchange rate inputs
  const [usdRate, setUsdRate] = useState(String(exchangeRates.USD));
  const [plnRate, setPlnRate] = useState(String(exchangeRates.PLN));
  const [eurRate, setEurRate] = useState(String(exchangeRates.EUR));

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    updateAiSettings({
      provider,
      geminiApiKey: geminiKeyInput.trim(),
      geminiModel,
      deepseekApiKey: deepseekKeyInput.trim(),
      deepseekModel,
    });
    setTestStatus('Đã lưu cấu hình AI bảo mật thành công!');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestAi = async () => {
    setIsTesting(true);
    setTestStatus('Đang kiểm tra kết nối API...');
    try {
      if (provider === 'gemini') {
        if (!geminiKeyInput.trim()) {
          throw new Error('Vui lòng nhập API Key Gemini trước');
        }
        await callGeminiApi(
          geminiKeyInput.trim(),
          geminiModel,
          'Ăn bún bò 50k',
          categories,
          wallets
        );
        setTestStatus('Kết nối Gemini API thành công!');
      } else {
        if (!deepseekKeyInput.trim()) {
          throw new Error('Vui lòng nhập API Key DeepSeek trước');
        }
        await callDeepSeekApi(
          deepseekKeyInput.trim(),
          deepseekModel,
          'Ăn bún bò 50k',
          categories,
          wallets
        );
        setTestStatus('Kết nối DeepSeek API thành công!');
      }
    } catch (err: any) {
      setTestStatus(`Lỗi: ${err.message || 'Không thể kết nối'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateExchangeRates({
      ...exchangeRates,
      USD: parseFloat(usdRate) || exchangeRates.USD,
      PLN: parseFloat(plnRate) || exchangeRates.PLN,
      EUR: parseFloat(eurRate) || exchangeRates.EUR,
      lastUpdated: new Date().toISOString(),
    });
    setRatesSuccessMsg(true);
    setTimeout(() => setRatesSuccessMsg(false), 2500);
  };

  const handleLiveRatesRefresh = async () => {
    setIsRefreshingRates(true);
    const ok = await refreshExchangeRates();
    setIsRefreshingRates(false);
    if (ok) {
      setRatesSuccessMsg(true);
      setTimeout(() => setRatesSuccessMsg(false), 2500);
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
    a.download = `mywallet-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
          Cài Đặt Hệ Thống
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Tùy chỉnh API AI, bảo mật, ngoại tệ và giao diện
        </p>
      </div>

      {/* 1. Cấu hình AI (Gemini / DeepSeek) */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Trí Tuệ Nhân Tạo & API Key
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Lưu trữ cục bộ an toàn, không lộ API ra ngoài
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Được mã hóa</span>
          </div>
        </div>

        <form onSubmit={handleSaveAi} className="space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Chọn Nhà Cung Cấp AI
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  provider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="text-sm font-bold">Google Gemini</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Hỗ trợ cả giọng nói và quét ảnh bill receipt cực nhanh
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('deepseek')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  provider === 'deepseek'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="text-sm font-bold">DeepSeek AI</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  DeepSeek-V3 / Chat, chi phí siêu rẻ và thông minh
                </div>
              </button>
            </div>
          </div>

          {/* Gemini Key Input */}
          {provider === 'gemini' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Model Gemini
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng - Nhanh & Chính xác)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>
            </div>
          )}

          {/* DeepSeek Key Input */}
          {provider === 'deepseek' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  DeepSeek API Key
                </label>
                <div className="relative">
                  <input
                    type={showDeepseekKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={deepseekKeyInput}
                    onChange={(e) => setDeepseekKeyInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                  >
                    {showDeepseekKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Model DeepSeek
                </label>
                <select
                  value={deepseekModel}
                  onChange={(e) => setDeepseekModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="deepseek-chat">deepseek-chat (V3)</option>
                  <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                </select>
              </div>
            </div>
          )}

          {testStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                testStatus.includes('thành công')
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {testStatus}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestAi}
              isLoading={isTesting}
              className="flex-1"
            >
              Kiểm tra kết nối
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Lưu cấu hình AI
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Cài đặt Tỷ giá Ngoại tệ */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Tỷ Giá Ngoại Tệ Quy Đổi Sang VNĐ
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                1 đơn vị ngoại tệ tương ứng với bao nhiêu VNĐ
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLiveRatesRefresh}
            isLoading={isRefreshingRates}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Cập nhật trực tuyến</span>
          </Button>
        </div>

        <form onSubmit={handleSaveRates} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                1 USD (Đô la Mỹ)
              </label>
              <input
                type="number"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                1 PLN (Złoty Ba Lan)
              </label>
              <input
                type="number"
                value={plnRate}
                onChange={(e) => setPlnRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                1 EUR (Euro)
              </label>
              <input
                type="number"
                value={eurRate}
                onChange={(e) => setEurRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono"
              />
            </div>
          </div>

          {ratesSuccessMsg && (
            <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Đã cập nhật tỷ giá thành công</span>
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="sm">
              Lưu tỷ giá
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Giao diện (Theme) */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-3">
          Chế Độ Giao Diện
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
            }`}
          >
            <Sun className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <span className="text-xs">Sáng</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
            }`}
          >
            <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
            <span className="text-xs">Tối</span>
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'system'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
            }`}
          >
            <RotateCcw className="w-5 h-5 mx-auto mb-1 text-neutral-400" />
            <span className="text-xs">Hệ thống</span>
          </button>
        </div>
      </Card>

      {/* 4. Dữ liệu & Sao lưu */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-white/5">
          Quản Lý Dữ Liệu & Sao Lưu
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-1.5" />
            <span>Sao lưu dữ liệu (JSON)</span>
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu mẫu không?')) {
                resetAllData();
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            <span>Khôi phục dữ liệu mẫu</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
