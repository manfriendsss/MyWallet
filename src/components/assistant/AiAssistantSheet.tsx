import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Mic, MicOff, Send, Camera, X, Check, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as NativeCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import confetti from 'canvas-confetti';
import { useWallet } from '../../context/WalletContext';
import { compressImageToWebP, ACCEPTED_IMAGE_TYPES } from '../../utils/imageCompressor';
import { startSpeechRecognition, isSpeechRecognitionSupported } from '../../services/speech';
import { callGeminiApi, callDeepSeekApi, parseTransactionLocally, aiKeyFor, isTransientAiError } from '../../services/ai';
import type { ParsedTransactionFromAi, TransactionType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { toLocalISODate } from '../../utils/date';
import { useDialog } from '../../utils/useDialog';
import { receiptApi } from '../../services/api';
import { TransactionFormModal } from '../transactions/TransactionForm';
import { cn } from '../../utils/cn';
import { Tooltip } from '../ui/Tooltip';
import { walletByName, walletMentionedIn } from '../../utils/walletMatch';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  previewData?: ParsedTransactionFromAi;
  isError?: boolean;
}

const iconButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors disabled:opacity-55';

/** Which AI answers: DeepSeek in a blue outline, Gemini in a rainbow one */
const ProviderPill: React.FC<{ provider: 'gemini' | 'deepseek' }> = ({ provider }) => {
  const isGemini = provider === 'gemini';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full p-[1.5px]',
        isGemini ? 'bg-[image:var(--gradient-rainbow)]' : 'bg-deepseek'
      )}
    >
      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
        {isGemini ? 'Gemini' : 'DeepSeek'}
      </span>
    </span>
  );
};

interface AiAssistantSheetProps {
  floating?: boolean;
  onDismiss?: () => void;
}

export const AiAssistantSheet: React.FC<AiAssistantSheetProps> = ({ floating = false, onDismiss }) => {
  const {
    isAssistantOpen,
    closeAssistant,
    categories,
    wallets,
    addTransaction,
    addTransfer,
    previewTransferAmount,
    aiSettings,
  } = useWallet();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<ParsedTransactionFromAi | null>(null);
  /** Upload of the receipt photo being read (resolves to its key), attached to the transaction on save */
  const receiptUpload = useRef<Promise<string | null> | null>(null);
  /** While a photo is being read, the pill shows Gemini, which reads all images */
  const [readingImage, setReadingImage] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const panelRef = useDialog(isAssistantOpen, closeAssistant);
  const titleId = useId();

  const handleClose = () => {
    closeAssistant();
    onDismiss?.();
  };

  const hasCloudAi =
    aiSettings.keySource === 'server' ||
    (aiSettings.provider === 'gemini' && Boolean(aiSettings.geminiApiKey)) ||
    (aiSettings.provider === 'deepseek' && Boolean(aiSettings.deepseekApiKey));
  const geminiKey = aiKeyFor(aiSettings, 'gemini');
  const deepseekKey = aiKeyFor(aiSettings, 'deepseek');
  const canReadReceipts = Boolean(geminiKey);

  useEffect(() => {
    if (isAssistantOpen && messages.length === 0 && hasCloudAi) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: 'Nói, gõ hoặc gửi ảnh hóa đơn. Tôi sẽ ghi vào đúng danh mục và nguồn tiền.',
        },
      ]);
    }
  }, [isAssistantOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, currentPreview]);

  // Stop the microphone whenever the sheet closes
  useEffect(() => {
    if (!isAssistantOpen && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isAssistantOpen]);

  const pushAi = (text: string, extra: Partial<ChatMessage> = {}) =>
    setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text, ...extra }]);

  // Voice recording handler
  const handleToggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Safari.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    setSpeechError(null);
    setIsListening(true);

    void startSpeechRecognition({
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
        setTimeout(() => setSpeechError(null), 4000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    }).then((rec) => {
      recognitionRef.current = rec;
      if (!rec) setIsListening(false);
    });
  };

  // Image Upload with WebP 85 Compression
  const handleReceiptImage = async (file: File) => {
    if (!canReadReceipts) {
      // No key: say so plainly rather than inventing a transaction from the photo
      pushAi('Đọc ảnh hóa đơn cần Gemini API key. Thêm key trong Cài đặt, hoặc gõ số tiền ở đây.', { isError: true });
      return;
    }

    setIsProcessing(true);
    setReadingImage(true);
    try {
      const compressed = await compressImageToWebP(file, 1600, 0.85);

      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}`, sender: 'user', text: 'Ảnh hóa đơn', imageUrl: compressed.dataUrl },
      ]);

      // Keep the photo with the transaction: store it while Gemini reads it.
      // Images always go to Gemini, whatever the chat provider is (DeepSeek cannot read images here).
      if (aiSettings.keySource === 'server') {
        receiptUpload.current = receiptApi.upload(compressed.blob).catch(() => null);
      }

      const response = await callGeminiApi(
        geminiKey,
        aiSettings.geminiModel,
        'Phân tích hóa đơn này và trích xuất giao dịch',
        categories,
        wallets,
        compressed.dataUrl
      );

      if (response.data) setCurrentPreview(response.data);
      pushAi(response.message, { previewData: response.data });
    } catch (err) {
      pushAi(`Không đọc được hóa đơn. ${err instanceof Error ? err.message : ''}`, { isError: true });
    } finally {
      setIsProcessing(false);
      setReadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleReceiptImage(file).finally(() => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const handleReceiptPicker = async () => {
    if (!Capacitor.isNativePlatform()) {
      fileInputRef.current?.click();
      return;
    }

    try {
      // The native prompt offers both camera and gallery. Android only asks for
      // Camera when the user chooses to take a photo.
      const photo = await NativeCamera.getPhoto({
        source: CameraSource.Prompt,
        resultType: CameraResultType.DataUrl,
        quality: 90,
        width: 1600,
        correctOrientation: true,
        promptLabelHeader: 'Ảnh hóa đơn',
        promptLabelPicture: 'Chụp ảnh',
        promptLabelPhoto: 'Chọn từ thư viện',
        promptLabelCancel: 'Hủy',
      });
      if (!photo.dataUrl) return;
      const blob = await (await fetch(photo.dataUrl)).blob();
      await handleReceiptImage(new File([blob], 'hoa-don.jpg', { type: blob.type || 'image/jpeg' }));
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('cancel')) return;
      pushAi('Không thể mở camera. Hãy cấp quyền Camera trong Cài đặt rồi thử lại.', { isError: true });
    }
  };

  // Process text input (chat or speech)
  const handleProcessInput = async (textToSend?: string) => {
    const raw = (textToSend || input).trim().slice(0, 500);
    if (!raw || isProcessing) return;

    setInput('');
    setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, sender: 'user', text: raw }]);
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

      if (aiSettings.provider === 'gemini' && geminiKey) {
        const res = await callGeminiApi(geminiKey, aiSettings.geminiModel, promptToAi, categories, wallets);
        responseMessage = res.message;
        parsedData = res.data;
      } else if (aiSettings.provider === 'deepseek' && deepseekKey) {
        const res = await callDeepSeekApi(deepseekKey, aiSettings.deepseekModel, promptToAi, categories, wallets);
        responseMessage = res.message;
        parsedData = res.data;
      } else {
        // Smart Local Parser
        const local = parseTransactionLocally(raw, categories, wallets);
        responseMessage = local.message;
        parsedData = local.data.amount > 0 ? local.data : undefined;
      }

      if (parsedData) setCurrentPreview(parsedData);
      pushAi(responseMessage, { previewData: parsedData });
    } catch (err) {
      // AI overloaded: don't leave the user empty-handed, read the sentence on the device instead
      const local = isTransientAiError(err) && !currentPreview ? parseTransactionLocally(raw, categories, wallets) : null;
      if (local && local.data.amount > 0) {
        setCurrentPreview(local.data);
        pushAi(`AI đang quá tải, đã đọc bằng bộ đọc trên máy. ${local.message}`, { previewData: local.data });
      } else {
        pushAi(err instanceof Error ? err.message : 'Có lỗi khi xử lý. Thử lại.', { isError: true });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /** A wallet the AI named, tolerating shortened or reworded names ("Visa" for "Thẻ Visa VIB") */
  const findWallet = (name?: string) => walletByName(name, wallets);

  const isTransfer = currentPreview?.type === 'transfer';
  // Only an unnamed wallet falls back to one in the same currency (an unmatched name used to land in the
  // first VND wallet, so card spending never showed up as card debt)
  const entryWallet =
    currentPreview && !isTransfer
      ? findWallet(currentPreview.walletName) ||
        walletMentionedIn(currentPreview.rawText ?? '', wallets) ||
        wallets.find((w) => w.currency === currentPreview.currency && w.kind !== 'credit') ||
        wallets[0]
      : undefined;
  const transferFrom = isTransfer ? findWallet(currentPreview?.walletName) : undefined;
  const transferTo = isTransfer ? findWallet(currentPreview?.toWalletName) : undefined;
  const transferReady = Boolean(transferFrom && transferTo && transferFrom.id !== transferTo.id);

  /** What leaves the source and what arrives, in each wallet's own currency */
  const transferAmounts = () => {
    if (!currentPreview || !transferFrom || !transferTo) return null;
    let sent = currentPreview.amount;
    let received = currentPreview.toAmount;
    // Stated in the destination's currency ("nạp 100 đô vào PayPal"): that is what arrives
    if (currentPreview.currency !== transferFrom.currency && currentPreview.currency === transferTo.currency) {
      received = currentPreview.amount;
      sent = previewTransferAmount(transferTo.id, transferFrom.id, currentPreview.amount);
    }
    return { sent, received: received ?? previewTransferAmount(transferFrom.id, transferTo.id, sent) };
  };

  const canSave = Boolean(
    currentPreview &&
      currentPreview.amount > 0 &&
      (isTransfer ? transferReady : wallets.length > 0 && categories.length > 0)
  );

  const celebrateAndClose = () => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.8 },
      disableForReducedMotion: true,
    });

    setCurrentPreview(null);
    receiptUpload.current = null;
    setMessages([]);
    handleClose();
  };

  // Confirm and Save transaction
  const handleConfirmSave = async () => {
    if (!currentPreview || !canSave) return;

    if (isTransfer) {
      const amounts = transferAmounts();
      if (!amounts || !transferFrom || !transferTo || !(amounts.sent > 0)) return;
      addTransfer(transferFrom.id, transferTo.id, amounts.sent, {
        toAmount: amounts.received > 0 ? amounts.received : undefined,
        fee: currentPreview.fee,
        note: currentPreview.note,
        date: currentPreview.date || toLocalISODate(),
      });
      celebrateAndClose();
      return;
    }

    // A photo still uploading is waited for, so it stays with the transaction
    const receiptKey = receiptUpload.current ? await receiptUpload.current : null;

    // Find category ID or match first
    const targetType: TransactionType = currentPreview.type === 'income' ? 'income' : 'expense';
    const cat =
      categories.find((c) => c.type === targetType && c.name.toLowerCase() === currentPreview.categoryName.toLowerCase()) ||
      categories.find((c) => c.type === targetType) ||
      categories[0];

    // Find wallet ID
    const wallet = entryWallet ?? wallets[0];

    addTransaction({
      type: targetType,
      amount: currentPreview.amount,
      currency: currentPreview.currency,
      walletId: wallet.id,
      categoryId: cat.id,
      note: currentPreview.note || cat.name,
      date: currentPreview.date || toLocalISODate(),
      time: new Date().toTimeString().slice(0, 5),
      isAiGenerated: true,
      receiptKey: receiptKey ?? undefined,
    });

    celebrateAndClose();
  };

  const previewIndex = currentPreview ? messages.findLastIndex((m) => m.previewData) : -1;
  const amounts = isTransfer ? transferAmounts() : null;
  const cannotSaveReason = !currentPreview
    ? ''
    : !(currentPreview.amount > 0)
      ? 'Chưa có số tiền hợp lệ. Gõ lại kèm số tiền.'
      : wallets.length === 0
        ? 'Chưa có nguồn tiền nào. Thêm ví ở Tổng quan trước rồi lưu giao dịch.'
        : isTransfer && !transferReady
          ? 'Chưa rõ chuyển từ đâu sang đâu. Gõ thêm, ví dụ “từ Techcombank sang Tiền mặt”.'
          : '';

  const previewRow = (label: string, value: React.ReactNode, className = 'truncate font-semibold text-ink') => (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={className}>{value}</dd>
    </div>
  );

  const previewBubble = currentPreview && (
    <div className="flex justify-start">
      <section
        aria-label="Kiểm tra trước khi lưu"
        className="w-[85%] max-w-sm rounded-card rounded-bl-[4px] bg-paper-3 px-3.5 py-3 text-sm text-ink"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Kiểm tra trước khi lưu</h3>
          <p className="text-xs text-muted">Sai? Gõ tiếp để sửa</p>
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
          {isTransfer ? (
            <>
              {previewRow(
                'Số tiền',
                formatCurrency(amounts?.sent ?? currentPreview.amount, transferFrom?.currency ?? currentPreview.currency),
                'figure text-lg font-bold text-ink'
              )}
              {previewRow('Loại', 'Chuyển tiền')}
              {previewRow('Từ', transferFrom?.name ?? (currentPreview.walletName || 'Chưa rõ'))}
              {previewRow('Sang', transferTo?.name ?? (currentPreview.toWalletName || 'Chưa rõ'))}
              {transferFrom && transferTo && transferFrom.currency !== transferTo.currency && amounts && amounts.received > 0 &&
                previewRow('Nhận được', formatCurrency(amounts.received, transferTo.currency), 'figure font-semibold text-ink')}
              {currentPreview.fee !== undefined &&
                previewRow(
                  'Phí',
                  formatCurrency(currentPreview.fee, transferFrom?.currency ?? currentPreview.currency),
                  'figure font-semibold text-expense'
                )}
            </>
          ) : (
            <>
              {previewRow(
                'Số tiền',
                `${currentPreview.type === 'income' ? '+' : '−'}${formatCurrency(currentPreview.amount, currentPreview.currency)}`,
                cn('figure text-lg font-bold', currentPreview.type === 'income' ? 'text-income' : 'text-expense')
              )}
              {previewRow('Loại', currentPreview.type === 'income' ? 'Thu nhập' : 'Chi tiêu')}
              {previewRow('Danh mục', currentPreview.categoryName)}
              {previewRow('Nguồn tiền', entryWallet?.name ?? (currentPreview.walletName || 'Mặc định'))}
            </>
          )}
          {currentPreview.note && (
            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-muted">Ghi chú</dt>
              <dd className="truncate text-ink-2">{currentPreview.note}</dd>
            </div>
          )}
        </dl>

        {cannotSaveReason && <p className="mt-2 text-sm font-semibold text-expense">{cannotSaveReason}</p>}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentPreview(null)}
            className="h-10 rounded-control border border-rule-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper-2 transition-colors"
          >
            Bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={!canSave}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-55 transition-colors"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{isTransfer ? 'Lưu chuyển tiền' : 'Lưu giao dịch'}</span>
          </button>
        </div>
      </section>
    </div>
  );

  return (
    <>
    {createPortal(
    <AnimatePresence>
      {isAssistantOpen && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
            aria-hidden="true"
            className={cn('fixed inset-0', floating ? 'bg-transparent' : 'bg-scrim')}
          />

          {/* Sheet */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative flex w-full flex-col overflow-hidden bg-surface shadow-[var(--shadow-overlay)] outline-none',
              floating ? 'h-full max-w-none rounded-card' : 'h-[88dvh] max-w-xl rounded-t-card sm:h-[80dvh] sm:rounded-card'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 pt-5 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <h2 id={titleId} className="text-lg text-ink">
                  Thêm giao dịch
                </h2>
                {hasCloudAi && <ProviderPill provider={readingImage ? 'gemini' : aiSettings.provider} />}
              </div>
              <button type="button" onClick={handleClose} aria-label="Đóng" className={cn(iconButton, '-mr-2 -mt-1')}>
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Conversation */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <React.Fragment key={msg.id}>
                  <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed',
                        isUser
                          ? 'rounded-br-[4px] bg-accent text-accent-ink'
                          : msg.isError
                            ? 'rounded-bl-[4px] bg-expense-soft text-ink'
                            : 'rounded-bl-[4px] bg-paper-3 text-ink'
                      )}
                    >
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Ảnh hóa đơn đã gửi" className="mb-2 max-h-48 w-full rounded-control object-cover" />
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                  {/* The check before saving is the bot's next bubble, under the answer that produced it */}
                  {index === previewIndex && previewBubble}
                  </React.Fragment>
                );
              })}

              {isProcessing && (
                <p role="status" className="flex items-center gap-2 py-1 text-sm text-muted">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
                  <span>Đang phân tích…</span>
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>

            {speechError && (
              <p role="alert" className="mx-4 mb-2 flex items-center gap-2 rounded-control bg-expense-soft p-2.5 text-sm text-ink">
                <AlertCircle className="w-4 h-4 shrink-0 text-expense" aria-hidden="true" />
                <span>{speechError}</span>
              </p>
            )}

            {/* Composer */}
            <div className="border-t border-rule bg-paper-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessInput();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <Tooltip content="Nhập tay">
                  <button
                    type="button"
                    onClick={() => {
                      // Keep the assistant underneath so Back returns to it.
                      setManualOpen(true);
                    }}
                    className={iconButton}
                    aria-label="Nhập tay"
                  >
                    <PenLine className="w-5 h-5" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content={canReadReceipts ? 'Chụp hoặc chọn ảnh hóa đơn' : 'Cần Gemini API key để đọc hóa đơn'}>
                  <button
                    type="button"
                    onClick={() => void handleReceiptPicker()}
                    disabled={isProcessing}
                    className={iconButton}
                    aria-label="Gửi ảnh hóa đơn"
                  >
                    <Camera className="w-5 h-5" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content={isListening ? 'Dừng ghi âm' : 'Nói bằng giọng nói'}>

                <button
                  type="button"
                  onClick={handleToggleVoice}
                  aria-pressed={isListening}
                  aria-label={isListening ? 'Dừng ghi âm' : 'Nói bằng giọng nói'}
                  className={cn(iconButton, isListening && 'bg-expense text-accent-ink hover:bg-expense hover:text-accent-ink')}
                >
                  {isListening ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
                </button>
                </Tooltip>

                <label htmlFor="assistant-input" className="sr-only">
                  Nội dung giao dịch
                </label>
                <input
                  id="assistant-input"
                  name="assistantInput"
                  type="text"
                  autoComplete="off"
                  enterKeyHint="send"
                  maxLength={500}
                  data-autofocus
                  placeholder={
                    isListening
                      ? 'Đang nghe…'
                      : currentPreview
                        ? 'Sửa: “đổi thành 70k”, “ví PayPal”…'
                        : 'Bún bò 65k tiền mặt, lương 30tr…'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isProcessing}
                  className="field flex-1 min-w-0"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  aria-label="Gửi"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-55 transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )}
    <TransactionFormModal isOpen={manualOpen} onClose={() => setManualOpen(false)} />
    </>
  );
};
