import { useCallback } from 'react';
import { useWebSocket } from '@/context/websocket-context';
import { useMediaCapture } from './use-media-capture';

export function useTriggerSpeak() {
  const { sendMessage } = useWebSocket();
  // 미디어 데이터 보내는 부분 삭제 (메시지 보내는쪽은 남아있음)
  // const { captureAllMedia } = useMediaCapture();

  const sendTriggerSignal = useCallback(
    async (actualIdleTime: number) => {
      // const images = await captureAllMedia();
      sendMessage({
        type: "ai-speak-signal",
        idle_time: actualIdleTime,
        undefined
      });
    },
    [sendMessage],
  );

  return {
    sendTriggerSignal,
  };
}
