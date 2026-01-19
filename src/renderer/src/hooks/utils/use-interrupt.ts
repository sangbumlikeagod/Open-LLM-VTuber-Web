import { useAiState } from '@/context/ai-state-context';
import { useWebSocket } from '@/context/websocket-context';
import { audioTaskQueue } from '@/utils/task-queue';
import { useSubtitle } from '@/context/subtitle-context';
import { useAudioTask } from './use-audio-task';

export const useInterrupt = () => {
  const { aiState, setAiState } = useAiState();
  const { sendMessage } = useWebSocket();
  // const { currentModel } = useLive2DModel();
  const { subtitleText, setSubtitleText } = useSubtitle();
  const { stopCurrentAudioAndLipSync } = useAudioTask();

  const interrupt = (sendSignal = true) => {
    if (aiState !== 'thinking-speaking') return;
    console.log('Interrupting conversation chain');

    stopCurrentAudioAndLipSync();

    audioTaskQueue.clearQueue();

    setAiState('interrupted');



    if (subtitleText === 'Thinking...') {
      setSubtitleText('');
    }
    console.log('Interrupted!');
  };

  return { interrupt };
};
