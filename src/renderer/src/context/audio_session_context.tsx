import {
  createContext, useMemo, useContext, useCallback, useRef,
  MutableRefObject
} from 'react';
import { useWebSocket } from '@/context/websocket-context';

export interface AddAudioTaskOptions {
  audioBase64: string;
  volumes: number[];
  sliceLength: number;
  displayText: {
    text: string;
    name: string;
    avatar: string;
  };
}

export interface AudioSegmentsContext {

  // 오디오 관련
  setAudio : (idx : number, audio: string) => void,
  refreshAudioArray : () => void,
  consumeNextAudio : () => void,

  // addAudioTask 연결용 (외부에서 설정)
  registerAddAudioTask: (fn: (options: AddAudioTaskOptions) => void) => void,

  // 자막 관련
  setSubtitle : (idx : number, audio: string) => void,

  
  
  // 세션 관련
  sessionID : MutableRefObject<string>,
  isEnd : MutableRefObject<boolean>,
  changeSessionID: (session: string) => void,
  clearSessionID: () => void,


}

const MAXIMUM_NUMBER = 1000
const EMPTY_SIGNAL = "NONE"
const AudioSegmentsContext =  createContext<AudioSegmentsContext | null>(null)

// console.log("useAudioSession 호출 위치:", React.useContext(AudioSegmentsContext));

export function AudioContextProvider({ children } : { children : React.ReactNode })
{
  const audioContainer = useRef<Array<string>>(new Array(MAXIMUM_NUMBER).fill(""))
  const textContainer = useRef<Array<string>>(new Array(MAXIMUM_NUMBER).fill(""))

  const { sendMessage } = useWebSocket();
  const audioIndex = useRef<number>(0) 
  const isEnd = useRef<boolean>(false) 


  const addAudioTaskRef = useRef<((options: AddAudioTaskOptions) => void) | null>(null);

  const registerAddAudioTask = useCallback((fn: (options: AddAudioTaskOptions) => void) => {
    addAudioTaskRef.current = fn;
  }, []);

  
  const refreshAudioArray = useCallback(() => {
    audioContainer.current.fill(EMPTY_SIGNAL)
    isEnd.current = true
    audioIndex.current = 0
  }, [])
  
  const setAudio = useCallback((idx : number, audio: string) => {
    if (idx >= MAXIMUM_NUMBER)
    {
      throw "MAXIMUM NUMBER ERROR"
    }
    console.log(`${idx}번째 오디오가 왔고 배열에 넣었다 현재 인덱스는 ${audioIndex.current}`)
    audioContainer.current[idx] = audio
    

    // 다음 오디오라면
    if (idx == audioIndex.current + 1)
    {
      console.log(`${audioIndex.current} 번째 데이터 소모가 있음 setAudio`)

      audioIndex.current++
      if (addAudioTaskRef.current) {
        addAudioTaskRef.current({
          audioBase64: audioContainer.current[audioIndex.current],
          volumes: [],
          sliceLength: 0,
          displayText: {
            text : textContainer.current[audioIndex.current],
            name : "",
            avatar : "",
          }
        })
      }
    }
  }, [audioIndex.current])


  const setSubtitle = useCallback((idx : number, text: string) => {
    if (idx >= MAXIMUM_NUMBER)
    {
      throw "MAXIMUM NUMBER ERROR"
    }
    textContainer.current[idx] = text
  }, []) 

  const consumeNextAudio = useCallback(() => {
    if (audioIndex.current >= MAXIMUM_NUMBER)
    {
      throw "MAXIMUM NUMBER ERROR"
    }
    //다음 오디오가 있을떄는 이걸 쓰는걸로
    if (audioContainer.current[audioIndex.current + 1] === EMPTY_SIGNAL)
    {
      
      console.log("Next Audio is Empty. is End?: ",isEnd.current,  `${audioIndex.current} 번쨰 오디오에서 Call을 한다`)
      if (isEnd.current && audioIndex.current !== 0)
      {
        isEnd.current = false  // 중복 speakEnd 방지
        sendMessage({
          'topic' : 'speakEnd',
          'content' : {}
        })
      }
      return
    }


    audioIndex.current++
    console.log(`${audioIndex.current} 번째 데이터 소모가 있음 consumeNextAudio`)
    if (addAudioTaskRef.current) {
      addAudioTaskRef.current({
        audioBase64: audioContainer.current[audioIndex.current],
        volumes: [],
        sliceLength: 0,
        displayText: {
          text : textContainer.current[audioIndex.current],
          name : "",
          avatar : "",
        }
      })
    }
  }, [audioIndex.current])

  const sessionID = useRef<string>("")
  const changeSessionID = useCallback((session : string) => {
    sessionID.current = session
  }, [])
  const clearSessionID = useCallback(() => {
    sessionID.current = ""
  }, [])

  const contextValue = useMemo(
    () => ({
      setAudio,
      refreshAudioArray,
      sessionID,
      isEnd,
      setSubtitle,
      consumeNextAudio,
      registerAddAudioTask,
      changeSessionID,
      clearSessionID,
    }),
    [setAudio, refreshAudioArray, sessionID, setSubtitle, 
      consumeNextAudio, registerAddAudioTask, changeSessionID, clearSessionID
    
    ]
  );
  // const contextValue = useMemo(() => ({
  //   setAudio,
  //   refreshAudioArray,
  //   sessionID,
  //   setSubtitle,
  //   consumeNextAudio,
  //   changeSessionID,
  //   clearSessionID
  // }), [])
  return (
    <AudioSegmentsContext.Provider value={contextValue}>
      {children}
    </AudioSegmentsContext.Provider>
  )
}


export function useAudioSession() {
  const context = useContext(AudioSegmentsContext)

  if (!context) {
    throw new Error('useBgUrl must be used within a BgUrlProvider');
  }

  return context;
}