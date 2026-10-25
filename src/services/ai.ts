import type { AiSettings, Category, CurrencyCode, ParsedTransactionFromAi, TransactionType, Wallet } from '../types';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
};

const STORAGE_KEY_AI_SETTINGS = 'mywallet_ai_settings';

export function getStoredAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
    if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_AI_SETTINGS;
}

export function saveStoredAiSettings(settings: AiSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save AI settings:', err);
  }
}

/**
 * Strict System Prompt designed to prevent chatty or verbose AI answers.
 * Returns concise 1-sentence confirmation and structured JSON.
 */
function buildSystemPrompt(categories: Category[], wallets: Wallet[]): string {
  const catExpenseList = categories.filter((c) => c.type === 'expense').map((c) => c.name).join(', ');
  const catIncomeList = categories.filter((c) => c.type === 'income').map((c) => c.name).join(', ');
  const walletList = wallets.map((w) => `${w.name} (${w.currency})`).join(', ');

  return `BẠN LÀ HỆ THỐNG TRÍ TUỆ NHÂN TẠO PHÂN TÍCH GIAO DỊCH TÀI CHÍNH CỦA MYWALLET.

QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. KHÔNG chào hỏi ("Xin chào", "Chào bạn",...).
2. KHÔNG giải thích dài dòng, KHÔNG đưa ra lời khuyên tài chính sáo rỗng.
3. CHỈ LÀM VIỆC VÀ BÁO KẾT QUẢ NGẮN GỌN TRONG 1 CÂU DUY NHẤT:
   Cú pháp text trả về: "Đã phân loại: [Thu nhập/Chi tiêu] [Số tiền] [Loại tiền] ([Danh mục]) [từ/vào] [Nguồn tiền]"
   Nếu người dùng yêu cầu sửa: "Đã cập nhật: [Nội dung thay đổi ngắn gọn]"
4. BẮT BUỘC trả kèm một khối JSON duy nhất định dạng:
\`\`\`json
{
  "type": "income" | "expense",
  "amount": number,
  "currency": "VND" | "USD" | "PLN" | "EUR" | "GBP" | "JPY",
  "categoryName": "string",
  "walletName": "string",
  "note": "string",
  "date": "YYYY-MM-DD"
}
\`\`\`

DỮ LIỆU THAM CHIẾU HIỆN CÓ CỦA NGƯỜI DÙNG:
- Danh mục Chi tiêu: ${catExpenseList || 'Ăn uống, Mua sắm, Di chuyển, Hóa đơn, Nhà cửa, Giải trí, Sức khỏe, Khác'}
- Danh mục Thu nhập: ${catIncomeList || 'Lương, Thưởng, Đầu tư, Bán hàng, Quà tặng, Khác'}
- Nguồn tiền / Ví hiện có: ${walletList || 'Tiền mặt (VND), Tài khoản Ngân hàng (VND)'}

HƯỚNG DẪN BÓC TÁCH:
- Số tiền: hỗ trợ các từ viết tắt tiếng Việt ("k" = nghìn, "tr"/"triệu" = 1.000.000, "củ" = 1.000.000). Ví dụ: "65k" -> 65000, "15tr" -> 15000000.
- Ngoại tệ: nếu nhắc tới usd, đô -> "USD"; ba lan, pln, zloty -> "PLN"; euro -> "EUR"; mặc định là "VND".
- Nếu người dùng nhắc tới ví nào thì gán vào ví đó. Nếu không nhắc ví, chọn ví mặc định hợp lý với loại tiền tệ.
- Nếu không khớp hoàn toàn với danh mục có sẵn, hãy gán vào danh mục gần nhất hoặc tạo tên danh mục phù hợp.
- Ngày: Nếu nói "hôm qua", "hôm nay", tự tính toán ngày YYYY-MM-DD tương ứng. Hôm nay là ${new Date().toISOString().split('T')[0]}.`;
}

/**
 * Fallback Local NLP parser when no API key is provided
 * Parses Vietnamese input seamlessly
 */
export function parseTransactionLocally(
  input: string,
  categories: Category[],
  wallets: Wallet[]
): { message: string; data: ParsedTransactionFromAi } {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Detect Currency
  let currency: CurrencyCode = 'VND';
  if (lower.includes('usd') || lower.includes('đô') || lower.includes('$')) {
    currency = 'USD';
  } else if (lower.includes('pln') || lower.includes('ba lan') || lower.includes('zł')) {
    currency = 'PLN';
  } else if (lower.includes('eur') || lower.includes('euro') || lower.includes('€')) {
    currency = 'EUR';
  } else if (lower.includes('jpy') || lower.includes('yên') || lower.includes('¥')) {
    currency = 'JPY';
  }

  // 2. Detect Amount
  let amount = 0;
  const millionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|củ|m\b)/i);
  const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)\b/i);
  const plainNumberMatch = lower.match(/(?:[\$€¥zł]\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+)/);

  if (millionMatch) {
    const val = parseFloat(millionMatch[1].replace(',', '.'));
    amount = Math.round(val * 1_000_000);
  } else if (kMatch) {
    const val = parseFloat(kMatch[1].replace(',', '.'));
    amount = Math.round(val * 1_000);
  } else if (plainNumberMatch) {
    let clean = plainNumberMatch[1].replace(/\./g, '').replace(',', '.');
    amount = parseFloat(clean) || 0;
  }

  // 3. Detect Type (Income vs Expense)
  let type: TransactionType = 'expense';
  const incomeKeywords = ['lương', 'nhận', 'thưởng', 'thu nhập', 'chuyển vào', 'cộng tiền', 'bán', 'được cho', 'tiền về', 'nạp tiền'];
  if (incomeKeywords.some((kw) => lower.includes(kw))) {
    type = 'income';
  }

  // 4. Match Wallet
  let matchedWallet = wallets.find((w) => lower.includes(w.name.toLowerCase()));
  if (!matchedWallet) {
    matchedWallet = wallets.find((w) => w.currency === currency) || wallets[0];
  }

  // 5. Match Category
  const relevantCats = categories.filter((c) => c.type === type);
  let matchedCategory = relevantCats.find((c) => lower.includes(c.name.toLowerCase()));
  if (!matchedCategory) {
    if (type === 'income') {
      matchedCategory = relevantCats.find((c) => c.name.includes('Lương') || c.name.includes('Thu nhập')) || relevantCats[0];
    } else {
      if (lower.includes('ăn') || lower.includes('uống') || lower.includes('cà phê') || lower.includes('trưa') || lower.includes('tối') || lower.includes('bún') || lower.includes('phở') || lower.includes('cơm')) {
        matchedCategory = relevantCats.find((c) => c.name.includes('Ăn')) || relevantCats[0];
      } else if (lower.includes('xe') || lower.includes('xăng') || lower.includes('grab') || lower.includes('vé') || lower.includes('taxi')) {
        matchedCategory = relevantCats.find((c) => c.name.includes('Di chuyển')) || relevantCats[0];
      } else if (lower.includes('mua') || lower.includes('shopee') || lower.includes('áo') || lower.includes('quần') || lower.includes('sách')) {
        matchedCategory = relevantCats.find((c) => c.name.includes('Mua sắm')) || relevantCats[0];
      } else {
        matchedCategory = relevantCats[0];
      }
    }
  }

  let note = text;

  const data: ParsedTransactionFromAi = {
    type,
    amount,
    currency,
    categoryName: matchedCategory ? matchedCategory.name : (type === 'income' ? 'Thu nhập khác' : 'Chi tiêu khác'),
    walletName: matchedWallet ? matchedWallet.name : 'Ví tiền mặt',
    note: note.slice(0, 80),
    date: new Date().toISOString().split('T')[0],
    confidence: 0.85,
    rawText: text,
  };

  const typeLabel = type === 'income' ? 'Thu nhập' : 'Chi tiêu';
  const message = `Đã phân loại: ${typeLabel} ${amount.toLocaleString('vi-VN')} ${currency} (${data.categoryName}) vào ${data.walletName}.`;

  return { message, data };
}

/**
 * Call Gemini API (1.5 Flash / 2.5 Flash) with text or image
 */
export async function callGeminiApi(
  apiKey: string,
  model: string,
  prompt: string,
  categories: Category[],
  wallets: Wallet[],
  imageBase64?: string
): Promise<{ message: string; data?: ParsedTransactionFromAi }> {
  const systemInstruction = buildSystemPrompt(categories, wallets);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  if (imageBase64) {
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
    const cleanBase64 = imageBase64.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');

    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    });
    parts.push({
      text: prompt || 'Hãy phân tích hóa đơn / bill này, trích xuất số tiền, loại tiền, danh mục phù hợp và trả lời ngắn gọn theo quy định.',
    });
  } else {
    parts.push({ text: prompt });
  }

  const payload = {
    contents: [{ role: 'user', parts }],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Lỗi Gemini API (${res.status})`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseAiResponseString(rawText);
}

/**
 * Call DeepSeek API (/chat/completions)
 */
export async function callDeepSeekApi(
  apiKey: string,
  model: string,
  prompt: string,
  categories: Category[],
  wallets: Wallet[]
): Promise<{ message: string; data?: ParsedTransactionFromAi }> {
  const systemInstruction = buildSystemPrompt(categories, wallets);
  const endpoint = 'https://api.deepseek.com/chat/completions';

  const payload = {
    model: model || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 400,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Lỗi DeepSeek API (${res.status})`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || '';

  return parseAiResponseString(rawText);
}

function parseAiResponseString(rawText: string): { message: string; data?: ParsedTransactionFromAi } {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let parsedData: ParsedTransactionFromAi | undefined;

  if (jsonMatch && jsonMatch[1]) {
    try {
      const obj = JSON.parse(jsonMatch[1].trim());
      parsedData = {
        type: obj.type === 'income' ? 'income' : 'expense',
        amount: Number(obj.amount) || 0,
        currency: (obj.currency || 'VND') as CurrencyCode,
        categoryName: obj.categoryName || 'Chi tiêu khác',
        walletName: obj.walletName || 'Ví tiền mặt',
        note: obj.note || '',
        date: obj.date || new Date().toISOString().split('T')[0],
        confidence: 0.95,
        rawText,
      };
    } catch (e) {
      console.warn('Could not parse JSON from AI:', e);
    }
  }

  let cleanText = rawText.replace(/```(?:json)?\s*[\s\S]*?\s*```/g, '').trim();
  const firstSentence = cleanText.split('\n').filter((l) => l.trim().length > 0)[0] || cleanText;

  return {
    message: firstSentence || 'Đã phân loại giao dịch thành công.',
    data: parsedData,
  };
}
