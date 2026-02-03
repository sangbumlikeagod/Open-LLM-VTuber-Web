/* eslint-disable no-sparse-arrays */
/* eslint-disable react-hooks/exhaustive-deps */
// eslint-disable-next-line object-curly-newline
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { wsService, MessageEvent, SocketIOPayload } from '@/services/websocket-service';
import {
  WebSocketContext, HistoryInfo, defaultWsUrl, defaultBaseUrl,
} from '@/context/websocket-context';
import { ModelInfo, useLive2DConfig } from '@/context/live2d-config-context';
import { useSubtitle } from '@/context/subtitle-context';
import { audioTaskQueue } from '@/utils/task-queue';
import { useAudioTask } from '@/components/canvas/live2d';
import { useBgUrl } from '@/context/bgurl-context';
import { useConfig } from '@/context/character-config-context';
import { toaster } from '@/components/ui/toaster';
// import { useVAD } from '@/context/vad-context';
import { AiState, useAiState } from "@/context/ai-state-context";
import { useLocalStorage } from '@/hooks/utils/use-local-storage';
import { useGroup } from '@/context/group-context';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useBrowser } from '@/context/browser-context';
import { useSearchParams } from "react-router";
import { useAudioSession } from '@/context/audio_session_context'


function WebSocketHandler({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [wsState, setWsState] = useState<string>('CLOSED');
  const [wsUrl, setWsUrl] = useLocalStorage<string>('wsUrl', defaultWsUrl);
  const [baseUrl, setBaseUrl] = useLocalStorage<string>('baseUrl', defaultBaseUrl);
  const { aiState, setAiState, backendSynthComplete, setBackendSynthComplete } = useAiState();
  const { setModelInfo } = useLive2DConfig();
  const { setSubtitleText } = useSubtitle();
  const { setSubtitle, setAudio, isEnd, changeSessionID, clearSessionID, refreshAudioArray } = useAudioSession();

  const { addAudioTask } = useAudioTask();
  const bgUrlContext = useBgUrl();



  const { confUid, setConfName, setConfUid, setConfigFiles } = useConfig();
  const [pendingModelInfo, setPendingModelInfo] = useState<ModelInfo | undefined>(undefined);
  const { setSelfUid, setGroupMembers, setIsOwner } = useGroup();
  // const { startMic, stopMic, autoStartMicOnConvEnd } = useVAD();
  // const autoStartMicOnConvEndRef = useRef(autoStartMicOnConvEnd);
  const { interrupt } = useInterrupt();
  const { setBrowserViewData } = useBrowser();
  const [searchParams, setSearchParams] = useSearchParams()
  const STREAMER_ID = searchParams.get("streamer_id")

  const SequenceNumber = useRef<string>("")



  // useEffect(() => {
  //   autoStartMicOnConvEndRef.current = autoStartMicOnConvEnd;
  // }, [autoStartMicOnConvEnd]);

  useEffect(() => {
    if (pendingModelInfo && confUid) {
      setModelInfo(pendingModelInfo);
      setPendingModelInfo(undefined);
    }
  }, [pendingModelInfo, setModelInfo, confUid]);


  const handleControlMessage = useCallback((controlText: string) => {
    switch (controlText) {
      // case 'start-mic':
      //   console.log('Starting microphone...');
      //   startMic();
      //   break;
      // case 'stop-mic':
      //   console.log('Stopping microphone...');
      //   stopMic();
      //   break;
      case 'conversation-chain-start':
        setAiState('thinking-speaking');
        audioTaskQueue.clearQueue();
        break;
      case 'conversation-chain-end':
        audioTaskQueue.addTask(() => new Promise<void>((resolve) => {
          setAiState((currentState: AiState) => {
            if (currentState === 'thinking-speaking') {
              // Auto start mic if enabled
              // if (autoStartMicOnConvEndRef.current) {
              //   startMic();
              // }
              return 'idle';
            }
            return currentState;
          });
          resolve();
        }));
        break;
      default:
        console.warn('Unknown control command:', controlText);
    }
  }, [setAiState])

  const handleTextPayload = useCallback((payload : SocketIOPayload) => {
    console.log(`handle Text ${payload.dialogue} ${payload.dialogueOrder}`)

    if (
      payload.sequenceId === null 
    )
    {
      console.error("Sequence Id Missing")
      return 
    }
    else if (payload.sequenceId !== SequenceNumber.current)
    {
      console.error("wrong sequence id", `${payload.sequenceId} VS ${SequenceNumber.current}`)
      return 
    }
    console.log(payload.dialogue)
    // dialog가 맞는지 아닌지를, 
    if (payload.dialogue && payload.dialogueOrder)
    {
      setSubtitle(payload.dialogueOrder, payload.dialogue)
      // setSubtitleText(payload.dialogue)
    }


  }, [setSubtitle])

  const handleAudioPayload = useCallback((payload : SocketIOPayload) => {

    if (
      payload.sequenceId === null 
    )
    {
      console.error("Sequence Id Missing")
      return 
    }
    else if (payload.sequenceId !== SequenceNumber.current)
    {
      console.error("wrong sequence id")
      return 
    }


    if (payload.audioOrder && payload.audio)
    {
      const uint8Array = new Uint8Array(payload.audio);

      // 2. Uint8Array → base64 문자열
      const base64String = btoa(
        // String.fromCharCode.apply(null, uint8Array)
        // 또는 더 안전한 버전 (큰 파일 대비)
        Array.from(uint8Array).map(b => String.fromCharCode(b)).join('')
      );
      setAudio(payload.audioOrder, base64String)
    }

    // addAudioTask({
    //   audioBase64: payload.audio || '',
    //   volumes: [],
    //   sliceLength: 0,
    //   displayText: {
    //     avatar : 'sex',
    //     name : 'sex',
    //     text : 'sex',
    //   } ,
    //   // expressions: payload.actions?.expressions || null,
    //   // forwarded: payload.forwarded || false,
    // });

  }, [setAudio])


  const handleStartPayload = useCallback((payload : SocketIOPayload) => {
    console.log("handle Start")

    if (
      payload.sequenceId === null 
    )
    {
      console.error("Sequence Id Missing")
      return 
    }
    isEnd.current = false
    SequenceNumber.current = payload.sequenceId || ""
    refreshAudioArray()
    clearSessionID()

    console.log(
      SequenceNumber.current, " Sequence Start"
    )    
    //TODO 임시 코드로 배경화면 바꾸는 것을 넣겠다
    const arr : string[] = ['happy', 'normal', 'sad', 'surprise']
    if (true) {
      bgUrlContext?.setBackgroundUrl(
        `../../resources/background/${arr[Math.floor(Math.random() * arr.length)]}.mp4`
      );
    }


  }, [SequenceNumber.current, isEnd.current])


  const handleEndPayload = useCallback((payload : SocketIOPayload) => {
    if (
      payload.sequenceId === null 
    )
    {
      console.error("Sequence Id Missing")
      return 
    }
    else if (payload.sequenceId !== SequenceNumber.current)
    {
      console.error("wrong sequence id")
      return 
    }
    // if (payload.dialogue)
    // {
    //   setSubtitleText(payload.dialogue)
    // }


  }, [isEnd])

  const handleEmotionPayload = useCallback((payload : SocketIOPayload) => {
    console.log("handle Emotion")

    if (
      payload.sequenceId === null 
    )
    {
      console.error("Sequence Id Missing")
      return 
    }
    else if (payload.sequenceId !== SequenceNumber.current)
    {
      console.error("wrong sequence id")
      return 
    }

    if (payload.emotion) {
      bgUrlContext?.setBackgroundUrl(
        `../../resources/background/${payload.emotion}.mp4`
      );
    }


    if (payload.dialogue)
    {
      setSubtitleText(payload.dialogue)
    }


  }, [setSubtitleText])


  const handleWebSocketMessage = useCallback((message: MessageEvent) => {
    console.log('Received message from server:', message);
    switch (message.type) {
      case 'control':
        if (message.text) {
          handleControlMessage(message.text);
        }
        break;

      // TODO 얘랑 관련된 데이터 찾아야함
      case 'set-model-and-conf':


        setAiState('loading');
        if (message.conf_name) {
          setConfName(message.conf_name);
        }

        //TODO 삭제
        if (message.conf_uid) {
          setConfUid(message.conf_uid);
          console.log('confUid', message.conf_uid);
        }

        //TODO 삭제
        if (message.client_uid) {
          setSelfUid(message.client_uid);
        }
        
        message.model_info = JSON.parse(
          '{"type":"set-model-and-conf","model_info":{"name":"mao_pro","description":"","url":"/live2d-models/mao_pro/runtime/mao_pro.model3.json","kScale":0.5,"initialXshift":0,"initialYshift":0,"kXOffset":1150,"idleMotionGroupName":"Idle","emotionMap":{"neutral":0,"anger":2,"disgust":2,"fear":1,"joy":3,"smirk":3,"sadness":1,"surprise":3},"tapMotions":{"HitAreaHead":{"":1},"HitAreaBody":{"":1}}},"conf_name":"mao_pro","conf_uid":"mao_pro_001","client_uid":"93173c76-000d-401f-875d-a40ec5925f31"}'
        )

        console.log(message.model_info + "쪽의 데이터")
        // TODO 더 낫게 변경 
        setPendingModelInfo(message.model_info);
        // setModelInfo(message.model_info);
        // We don't know when the confRef in live2d-config-context will be updated, so we set a delay here for convenience
        if (message.model_info && !message.model_info.url.startsWith("http")) {
          const modelUrl = baseUrl + message.model_info.url;
          // eslint-disable-next-line no-param-reassign
          message.model_info.url = modelUrl;
        }

        setAiState('idle');
        break;



      //TODO 사용할 데이터
      case 'full-text':
        if (message.text) {
          setSubtitleText(message.text);
        }
        break;


      case 'config-files':
        if (message.configs) {
          setConfigFiles(message.configs);
        }
        break;
      case 'config-switched':
        setAiState('idle');
        setSubtitleText(t('notification.characterLoaded'));

        toaster.create({
          title: t('notification.characterSwitched'),
          type: 'success',
          duration: 2000,
        });

        // setModelInfo(undefined);

        // wsService.sendMessage({ type: 'fetch-history-list' });
        // wsService.sendMessage({ type: 'create-new-history' });
        break;




      case 'background-files':
        if (message.files) {
          bgUrlContext?.setBackgroundFiles(message.files);
        }
        break;


      // TODO 오디오는 wsService.on('audio', handleAudioPayload)에서 처리됨
      // case 'audio':
      //   if (aiState === 'interrupted' || aiState === 'listening') {
      //     console.log('Audio playback intercepted. Sentence:', message.display_text?.text);
      //   } else {
      //     console.log("actions", message.actions);
      //     message.display_text =  {
      //         'avatar' : 'sex',
      //         'name' : 'sex',
      //         'text' : 'sex',
      //     }
      //     addAudioTask({
      //       audioBase64: message.audio || '',
      //       volumes: message.volumes || [],
      //       sliceLength: message.slice_length || 0,
      //       displayText: message.display_text || {
      //         avatar : 'sex',
      //         name : 'sex',
      //         text : 'sex',
      //       } ,
      //       expressions: message.actions?.expressions || null,
      //       forwarded: message.forwarded || false,
      //     });
      //   }
      //   break;

        
      case 'new-history-created':
        setAiState('idle');
        setSubtitleText(t('notification.newConversation'));
        // No need to open mic here
        if (message.history_uid) {
          const newHistory: HistoryInfo = {
            uid: message.history_uid,
            latest_message: null,
            timestamp: new Date().toISOString(),
          };
          toaster.create({
            title: t('notification.newChatHistory'),
            type: 'success',
            duration: 2000,
          });
        }
        break;
      case 'history-deleted':
        toaster.create({
          title: message.success
            ? t('notification.historyDeleteSuccess')
            : t('notification.historyDeleteFail'),
          type: message.success ? 'success' : 'error',
          duration: 2000,
        });
        break;
      case 'history-list':
        if (message.histories) {
          if (message.histories.length > 0) {
          }
        }
        break;
      case 'user-input-transcription':
        console.log('user-input-transcription: ', message.text);
        if (message.text) {
        }
        break;
      case 'error':
        toaster.create({
          title: message.message,
          type: 'error',
          duration: 2000,
        });
        break;
      case 'group-update':
        console.log('Received group-update:', message.members);
        if (message.members) {
          setGroupMembers(message.members);
        }
        if (message.is_owner !== undefined) {
          setIsOwner(message.is_owner);
        }
        break;
      case 'group-operation-result':
        toaster.create({
          title: message.message,
          type: message.success ? 'success' : 'error',
          duration: 2000,
        });
        break;
      case 'backend-synth-complete':
        setBackendSynthComplete(true);
        break;
      case 'conversation-chain-end':
        if (!audioTaskQueue.hasTask()) {
          setAiState((currentState: AiState) => {
            if (currentState === 'thinking-speaking') {
              return 'idle';
            }
            return currentState;
          });
        }
        break;
      case 'interrupt-signal':
        // Handle forwarded interrupt
        interrupt(false); // do not send interrupt signal to server
        break;

      // case 'tool_call_status':
      //   if (message.tool_id && message.tool_name && message.status) {
      //     // If there's browser view data included, store it in the browser context
      //     if (message.browser_view) {
      //       console.log('Browser view data received:', message.browser_view);
      //       setBrowserViewData(message.browser_view);
      //     }

          
      //   } else {
      //     console.warn('Received incomplete tool_call_status message:', message);
      //   }
      //   break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }, [aiState, baseUrl, bgUrlContext, setAiState, 
    setConfName, setConfUid, setConfigFiles, 
    setModelInfo, setSubtitleText, setSelfUid, setGroupMembers,
    setIsOwner, backendSynthComplete, setBackendSynthComplete,
    handleControlMessage, interrupt,
    setBrowserViewData, t]
  );

  useEffect(() => {
    wsService.connect(wsUrl);
  }, [wsUrl]);

  useEffect(() => {
    const stateSubscription = wsService.onStateChange(setWsState);
    const messageSubscription = wsService.onMessage(handleWebSocketMessage);

    const textSubscription = wsService.on('text', handleTextPayload);
    const audioSubscription = wsService.on('audio', handleAudioPayload);
    const startSubscription = wsService.on('start', handleStartPayload);
    const endSubscription = wsService.on('end', handleEndPayload);
    const emotionSubscription = wsService.on('emotion', handleEmotionPayload);


    // const textSubscription = wsService.onText(handleTextPayload);
    // const audioSubscription = wsService.onAudio(handleAudioPayload);
    // const startSubscription = wsService.onStart(handleStartPayload);
    // const endSubscription = wsService.onEnd(handleEndPayload);
    // const emotionSubscription = wsService.onEmotion(handleEndPayload);

    return () => {
      stateSubscription.unsubscribe()
      messageSubscription.unsubscribe()

      // textSubscription.unsubscribe()
      // audioSubscription.unsubscribe()
      // startSubscription.unsubscribe()
      // endSubscription.unsubscribe()
      // emotionSubscription.unsubscribe()
      
    };
  }, [wsUrl, handleWebSocketMessage]);

  const webSocketContextValue = useMemo(() => ({
    sendMessage: wsService.sendMessage.bind(wsService),
    wsState,
    reconnect: () => wsService.connect(wsUrl),
    wsUrl,
    setWsUrl,
    baseUrl,
    setBaseUrl,
  }), [wsState, wsUrl, baseUrl]);

  return (
    <WebSocketContext.Provider value={webSocketContextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketHandler;
