// src/services/speech.ts
// Speech to Text support using the native Android recognizer in the APK and
// the Web Speech API in browsers.
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface SpeechRecognitionResultHandler {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export interface ActiveSpeechRecognition {
  stop: () => void;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  );
}

async function startNativeSpeechRecognition(handlers: SpeechRecognitionResultHandler): Promise<ActiveSpeechRecognition | null> {
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) {
      handlers.onError('Thiết bị chưa hỗ trợ nhận giọng nói.');
      return null;
    }

    let permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== 'granted') {
      // This is called directly from the microphone button, which lets Android
      // display its normal runtime permission dialog at the right moment.
      permission = await SpeechRecognition.requestPermissions();
    }
    if (permission.speechRecognition !== 'granted') {
      handlers.onError('Cần cấp quyền Micro để nhập giao dịch bằng giọng nói.');
      return null;
    }

    let latestTranscript = '';
    let finished = false;
    let partialListener: PluginListenerHandle | undefined;
    let stateListener: PluginListenerHandle | undefined;
    const cleanUp = () => {
      void partialListener?.remove();
      void stateListener?.remove();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      if (latestTranscript) handlers.onResult(latestTranscript, true);
      handlers.onEnd();
      cleanUp();
    };

    partialListener = await SpeechRecognition.addListener('partialResults', ({ matches }) => {
      const transcript = matches[0]?.trim();
      if (!transcript) return;
      latestTranscript = transcript;
      handlers.onResult(transcript, false);
    });
    stateListener = await SpeechRecognition.addListener('listeningState', ({ status }) => {
      if (status === 'stopped') finish();
    });

    await SpeechRecognition.start({ language: 'vi-VN', maxResults: 1, partialResults: true, popup: false });
    return {
      stop: () => {
        void SpeechRecognition.stop().catch(() => undefined);
        finish();
      },
    };
  } catch {
    handlers.onError('Không thể khởi động micro. Hãy kiểm tra quyền Micro trong Cài đặt.');
    return null;
  }
}

export async function startSpeechRecognition(handlers: SpeechRecognitionResultHandler): Promise<ActiveSpeechRecognition | null> {
  if (Capacitor.isNativePlatform()) {
    return startNativeSpeechRecognition(handlers);
  }

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
    return recognition as ActiveSpeechRecognition;
  } catch (err) {
    handlers.onError('Không thể khởi động micro.');
    return null;
  }
}
