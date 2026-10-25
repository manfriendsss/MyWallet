// src/services/speech.ts
// Speech to Text support using Web Speech API (vi-VN)

export interface SpeechRecognitionResultHandler {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startSpeechRecognition(handlers: SpeechRecognitionResultHandler) {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError('Trình duyệt chưa hỗ trợ nhận dạng giọng nói trực tiếp.');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'vi-VN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i];
      if (item.isFinal) {
        finalTranscript += item[0].transcript;
      } else {
        interimTranscript += item[0].transcript;
      }
    }

    if (finalTranscript) {
      handlers.onResult(finalTranscript, true);
    } else if (interimTranscript) {
      handlers.onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    let msg = 'Lỗi nhận dạng giọng nói';
    if (event.error === 'not-allowed') {
      msg = 'Vui lòng cấp quyền truy cập micro trong trình duyệt';
    } else if (event.error === 'no-speech') {
      msg = 'Không nhận thấy âm thanh, vui lòng thử lại';
    }
    handlers.onError(msg);
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  try {
    recognition.start();
    return recognition;
  } catch (err) {
    handlers.onError('Không thể khởi động micro.');
    return null;
  }
}
