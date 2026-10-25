import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  Image as ImageIcon,
  Sparkles,
  X,
  Check,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../context/WalletContext';
import { compressImageToWebP } from '../../utils/imageCompressor';
import { startSpeechRecognition, isSpeechRecognitionSupported } from '../../services/speech';
import { callGeminiApi, callDeepSeekApi, parseTransactionLocally } from '../../services/ai';
import type { ParsedTransactionFromAi } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  previewData?: ParsedTransactionFromAi;
}

export const AiAssistantSheet: React.FC = () => {
  const {
    isAssistantOpen,
    closeAssistant,
    categories,
    wallets,
    addTransaction,
    aiSettings,
  } = useWallet();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<ParsedTransactionFromAi | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isAssistantOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: 'Xin chào! Hãy nói, gõ hoặc gửi ảnh hóa đơn. Tôi sẽ phân loại vào đúng mục và nguồn tiền cho bạn.',
        },
      ]);
    }
  }, [isAssistantOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentPreview]);

  // Voice recording handler
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Trình duyệt chưa hỗ trợ nhận dạng giọng nói');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    setSpeechError(null);
    setIsListening(true);

    const rec = startSpeechRecognition({
      onResult: (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal) {
          setIsListening(false);
          // Auto send after speech
          handleProcessInput(transcript);
        }
      },
      onError: (err) => {
        setSpeechError(err);
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 3500);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    recognitionRef.current = rec;
  };

  // Image Upload with WebP 85 Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Compress to WebP quality 85%
      const compressed = await compressImageToWebP(file, 1600, 0.85);

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: 'Hóa đơn chi tiêu mới',
        imageUrl: compressed.dataUrl,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Call AI with multimodal image
      if (aiSettings.provider === 'gemini' && aiSettings.geminiApiKey) {
        const response = await callGeminiApi(
          aiSettings.geminiApiKey,
          aiSettings.geminiModel,
          'Phân tích hóa đơn này và trích xuất giao dịch',
          categories,
          wallets,
          compressed.dataUrl
        );

        if (response.data) {
          setCurrentPreview(response.data);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: response.message,
            previewData: response.data,
          },
        ]);
      } else {
        // Fallback local simulation if no Gemini key
        const local = parseTransactionLocally('Ăn uống hóa đơn 150k', categories, wallets);
        setCurrentPreview(local.data);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: `${local.message} (Lưu ý: Thêm Gemini API Key trong Cài đặt để AI đọc chi tiết toàn bộ hóa đơn).`,
            previewData: local.data,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Không thể đọc hóa đơn: ${err.message}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Process text input (chat or speech)
  const handleProcessInput = async (textToSend?: string) => {
    const raw = (textToSend || input).trim();
    if (!raw || isProcessing) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: raw,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      let promptToAi = raw;
      // If there is an existing preview and user is chatting to adjust/modify it:
      if (currentPreview) {
        promptToAi = `GIAO DỊCH HIỆN TẠI ĐANG XỬ LÝ:
${JSON.stringify(currentPreview)}

YÊU CẦU ĐIỀU CHỈNH CỦA NGƯỜI DÙNG:
"${raw}"

HÃY CẬP NHẬT LẠI VÀ CHỈ BÁO KẾT QUẢ NGẮN GỌN TRONG 1 CÂU THEO QUY ĐỊNH.`;
      }

      let responseMessage = '';
      let parsedData: ParsedTransactionFromAi | undefined;

      if (aiSettings.provider === 'gemini' && aiSettings.geminiApiKey) {
        const res = await callGeminiApi(
          aiSettings.geminiApiKey,
          aiSettings.geminiModel,
          promptToAi,
          categories,
          wallets
        );
        responseMessage = res.message;
        parsedData = res.data;
      } else if (aiSettings.provider === 'deepseek' && aiSettings.deepseekApiKey) {
        const res = await callDeepSeekApi(
          aiSettings.deepseekApiKey,
          aiSettings.deepseekModel,
          promptToAi,
          categories,
          wallets
        );
        responseMessage = res.message;
        parsedData = res.data;
      } else {
        // Smart Local Parser
        const local = parseTransactionLocally(raw, categories, wallets);
        responseMessage = local.message;
        parsedData = local.data;
      }

      if (parsedData) {
        setCurrentPreview(parsedData);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: responseMessage,
          previewData: parsedData,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Lỗi xử lý: ${err.message}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and Save transaction
  const handleConfirmSave = () => {
    if (!currentPreview) return;

    // Find category ID or match first
    const targetType = currentPreview.type;
    const cat =
      categories.find((c) => c.name.toLowerCase() === currentPreview.categoryName.toLowerCase()) ||
      categories.find((c) => c.type === targetType) ||
      categories[0];

    // Find wallet ID
    const wallet =
      wallets.find((w) => w.name.toLowerCase() === (currentPreview.walletName || '').toLowerCase()) ||
      wallets.find((w) => w.currency === currentPreview.currency) ||
      wallets[0];

    addTransaction({
      type: currentPreview.type,
      amount: currentPreview.amount,
      currency: currentPreview.currency,
      walletId: wallet.id,
      categoryId: cat.id,
      note: currentPreview.note || cat.name,
      date: currentPreview.date || new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      isAiGenerated: true,
    });

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
    });

    setCurrentPreview(null);
    closeAssistant();
  };

  if (!isAssistantOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAssistant}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Bottom Sheet Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative w-full max-w-xl z-10 bg-white dark:bg-[#101422] rounded-t-[32px] sm:rounded-3xl border-t sm:border border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col h-[88vh] sm:h-[80vh] overflow-hidden"
        >
          {/* Grab handle mobile */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Sheet Header */}
          <div className="px-6 py-3.5 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  Trợ Lý Chi Tiêu AI
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Auto-Classify
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Voice &bull; Chat &bull; Quét hóa đơn WebP 85
                </p>
              </div>
            </div>

            <button
              onClick={closeAssistant}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3.5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 rounded-bl-sm border border-neutral-200/50 dark:border-white/5'
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden max-h-48">
                        <img
                          src={msg.imageUrl}
                          alt="Hóa đơn"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shrink-0 text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 italic py-1 pl-9">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>AI đang phân tích và bóc tách giao dịch...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Transaction Preview Card (If parsed) */}
          {currentPreview && (
            <div className="mx-4 mb-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Xem trước giao dịch trích xuất
                </span>
                <span className="text-[11px] text-neutral-400">
                  (Nếu chưa đúng, hãy chat tiếp để yêu cầu sửa)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Phân loại</span>
                  <span className={`font-bold ${currentPreview.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {currentPreview.type === 'income' ? 'Thu nhập (+)' : 'Chi tiêu (-)'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[10px]">Số tiền</span>
                  <span className="font-extrabold font-mono text-sm text-neutral-900 dark:text-white">
                    {formatCurrency(currentPreview.amount, currentPreview.currency)}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[10px]">Danh mục</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {currentPreview.categoryName}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[10px]">Nguồn tiền / Ví</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {currentPreview.walletName || 'Mặc định'}
                  </span>
                </div>
              </div>

              {currentPreview.note && (
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 italic">
                  Ghi chú: {currentPreview.note}
                </div>
              )}

              {/* Action: Confirm & Save button */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setCurrentPreview(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Xác nhận & Lưu giao dịch</span>
                </button>
              </div>
            </div>
          )}

          {speechError && (
            <div className="mx-4 mb-2 p-2 rounded-xl bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Bottom Controls: Voice, Photo, Text Input */}
          <div className="p-3 bg-neutral-50 dark:bg-[#0c0f18] border-t border-neutral-200 dark:border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessInput();
              }}
              className="flex items-center gap-2"
            >
              {/* Photo Bill Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Chụp hoặc tải ảnh hóa đơn (tự nén WebP 85)"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Voice Input Mic Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
                title={isListening ? 'Đang lắng nghe... bấm để dừng' : 'Nói bằng giọng nói'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder={
                  isListening
                    ? 'Đang lắng nghe giọng nói của bạn...'
                    : currentPreview
                    ? 'Chat tiếp để sửa (VD: đổi thành 70k, ví paypal)...'
                    : 'VD: Ăn bún bò 65k tiền mặt, lương 30tr...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
