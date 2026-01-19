import { useRef, useCallback } from 'react';

export function useChatHistoryPanel() {
  const messageListRef = useRef<HTMLDivElement>(null);

  const handleMessageUpdate = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  return {
    messageListRef,
    handleMessageUpdate,
  };
}
