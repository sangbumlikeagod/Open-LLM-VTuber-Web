/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-use-before-define */

import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { ModelInfo } from '@/context/live2d-config-context';
import { HistoryInfo } from '@/context/websocket-context';
import { ConfigFile } from '@/context/character-config-context';
import { toaster } from '@/components/ui/toaster';
import axios from 'axios'


// 기존 인터페이스들 (변경 없음)
export interface DisplayText {
  text: string;
  name: string;
  avatar: string;
}


export interface SocketIOPayload {
  sequenceId? : string,
  audio?: ArrayBuffer;
  audioOrder?: number,
  dialogue?: string,
  dialogueOrder?: number,
  emotion : string,
}


interface BackgroundFile {
  name: string;
  url: string;
}

export interface AudioPayload {
  type: 'audio';
  audio?: string;
  volumes?: number[];
  slice_length?: number;
  display_text?: DisplayText;
  actions?: Actions;
}

export interface Message {
  id: string;
  content: string;
  role: "ai" | "human";
  timestamp: string;
  name?: string;
  avatar?: string;
  type?: 'text' | 'tool_call_status';
  tool_id?: string;
  tool_name?: string;
  status?: 'running' | 'completed' | 'error';
}

export interface Actions {
  expressions?: string[] | number[];
  pictures?: string[];
  sounds?: string[];
}

export interface MessageEvent {
  tool_id?: any;

  // sarsa 2.0 페이로드
  sequenceID?: string,
  audioOder? : number,
  dialogue? : string,
  dialogueOrder? : number,
  // 여기부터는 아님


  tool_name?: any;
  name?: any;
  status?: any;
  content?: string;
  timestamp?: string;
  type?: string;
  audio?: string;
  volumes?: number[];
  slice_length?: number;
  files?: BackgroundFile[];
  actions?: Actions;
  text?: string;
  model_info?: ModelInfo;
  conf_name?: string;
  conf_uid?: string;
  uids?: string[];
  messages?: Message[];
  history_uid?: string;
  success?: boolean;
  histories?: HistoryInfo[];
  configs?: ConfigFile[];
  message?: string;
  members?: string[];
  is_owner?: boolean;
  client_uid?: string;
  forwarded?: boolean;
  display_text?: DisplayText;
  live2d_model?: string;
  // browser_view?: {
  //   debuggerFullscreenUrl: string;
  //   debuggerUrl: string;
  //   pages: {
  //     id: string;
  //     url: string;
  //     faviconUrl: string;
  //     title: string;
  //     debuggerUrl: string;
  //     debuggerFullscreenUrl: string;
  //   }[];
  //   wsUrl: string;
  //   sessionId?: string;
  // };
  // Socket.IO에서 자주 쓰이는 에러/응답 필드도 허용
  error?: string;
}


// 번역 함수 (기존과 동일)
const getTranslation = () => {
  try {
    const i18next = require('i18next').default;
    return i18next.t.bind(i18next);
  } catch (e) {
    return (key: string) => key;
  }
};

class WebSocketService {
  private static instance: WebSocketService;

  private socket: Socket | null = null;

  private authToken : String = ""
  private streamer_id : String = ""
  private reconnectTimerId : ReturnType<typeof setTimeout> | null = null
  private messageSubject = new Subject<MessageEvent>();
  private payloadSubject = new Subject<SocketIOPayload>();
  private stateSubject = new Subject<'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>();

  private currentState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' = 'CLOSED';

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private initializeConnection() {
    // 연결 직후 실행할 초기 요청들


    // this.emit('fetch-backgrounds', {id : '11'});

    // setTimeout(() => {this.emit('firstSpeak', {})}, 1000)

    // this.emit('fetch-history-list', {});
    // this.emit('create-new-history', {});
  }


  private async changeAuthenticationState(result : boolean) {
    
    if (this.reconnectTimerId) {
        clearTimeout(
            this.reconnectTimerId
        )
        this.reconnectTimerId = null
    }

    this.isAuthenticated = result

    if (!result)
    {
        console.error("Authentication 으로 인한 연결 실패")
        this.reconnectTimerId = setTimeout( async () => {
            const success = await this.Authenticate("d", 0)
            if (success)
            {
                this.changeAuthenticationState(success)
            }
        }, 10000)
    }
    else{
      // console.log("연결시도중")
      // this._connect("http://127.0.0.1:7893/client-ws")
      this._connect("ws://192.168.191.215:8082/virtual")
      // this._connect("wss://local-studio-virtual.sooplive.co.kr/virtual")
    }
  }

  async Authenticate(StreamerId : String, BroadNum : Number){
        const isFirstAuthenticated = await axios.get(
            `https://live.sooplive.co.kr/api/get_broad_additional_info.php?szWork=chat&user_id=${StreamerId}&broad_no=${BroadNum}`,
            {
                withCredentials : true,
            })
            .then((ret) => {
                // console.log(`/crowd_check/api/get_broad_additional_info`, ret)
                if (ret.data.result !== 1)
                {
                    // setPlaceholder(NonAuthorize)
                    return false
                }
                if (ret.data.sarsa === false)
                {
                    // setPlaceholder(NonAuthorize)
                    return false
                }
                else
                {
                    return true                    
                }
            }).catch((err) => {
                console.log(err)

                // setPlaceholder(NonAuthorize)
                return false
            }
        )

        if (!isFirstAuthenticated)
        {
            return false
        } 

        // if (isNotAuthenticated === false && isSarsaAvailable  === true)
        
        const isSecondAuthenticated = await axios.get(
            // `/token/token?streamer_id=${StreamerId}`,
            `https://openapi.sooplive.co.kr/sarsa/token?streamer_id=${StreamerId}`,
            {
                withCredentials: true,
            }
        )
        .then((ret) => {
            if (ret.data.result !== 1) throw "로그인 실패"

            this.authToken = ret.data.result
            console.log(`get Auth Token ${this.authToken}`)
            console.warn(`get Auth Token ${this.authToken}`)
            console.error(`get Auth Token ${this.authToken}`)


            
            // setAuthTokens(ret.data.data.token)
        })
        .catch(() => {
            // setIsNotAuthenticated(true)
            // setPlaceholder(NonAuthorize)
            return false
        })
        

        if (!isSecondAuthenticated)
        {
            return false
        }
    }

    async RenewAuthCode(streamer_id : string) {
        let nextToken = ""
        await axios.get
        (
            `https://openapi.sooplive.co.kr/sarsa/token?streamer_id=${streamer_id}`,
            {
                withCredentials: true,
            }
        ).then((ret) => {
            console.log(ret)
            if (ret.data.result == 1) {
                nextToken = ret.data.data.token
            }
        })
        return nextToken
    }


    async _connect(url: string, options: object = {})
    {
      try{
          // 기존 소켓이 있으면 정리
          if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
          }

          console.log(url)
          this.socket = io(url, {
          reconnection: true,
          transports: ["websocket"],
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 10000,
          autoConnect: false,
          auth : {
              token : this.authToken || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhNDhyNms2OHlueSIsInVzZXJOaWNrbmFtZSI6Iuy4hOyLnCIsInNlcnZpY2VUeXBlIjoxLCJzdHJlYW1lcklkIjoiYXYxc29vcDEiLCJ1c2VyVHlwZSI6MSwiZXhwIjoxODUwOTE1OTU1LCJyYW5kb20iOjIwMzA1MjQ2ODV9.U8QAYyv3n4uSoVWIC_cJGhr-Ub2GfX--2av1TYUm3ZU",
              // token : this.authToken || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhNDhyNms2OHlueSIsInVzZXJOaWNrbmFtZSI6Iuy4hOyLnCIsInNlcnZpY2VUeXBlIjoxLCJzdHJlYW1lcklkIjoiZGxzbjk5MTEiLCJ1c2VyVHlwZSI6MSwiZXhwIjoxODUwOTE1OTU1LCJyYW5kb20iOjIwMzA1MjQ2ODV9.2OMaPQiKG5BAqNVGEc4Fep6B8uwf6UEvbOMXlsg0umM",
              // token : this.authToken || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhNDhyNms2OHlueSIsInVzZXJOaWNrbmFtZSI6Iuy4hOyLnCIsInNlcnZpY2VUeXBlIjoxLCJzdHJlYW1lcklkIjoibW9vbndvbDA2MTQiLCJ1c2VyVHlwZSI6MSwiZXhwIjoxODUwOTE1OTU1LCJyYW5kb20iOjIwMzA1MjQ2ODV9.R6Vgk-G3MPrjzQGN95gDJQiiQV6WFJ6A-Cuu3Vsy-eg",
          },
          // auth : true ? {
          //     token : this.authToken,
          // } : null,
          ...options,
        });

        // 연결 이벤트
        this.socket.on('connect', () => {
          this.currentState = 'OPEN';
          this.stateSubject.next('OPEN');
          console.log('Socket.IO 연결 성공');
          this.initializeConnection();
        });

        // 서버 → 클라이언트 메시지 수신
        // → 'message' 이벤트로 통일했으나, 원한다면 여러 이벤트로 분리 가능
        this.socket.on('message', (data: MessageEvent) => {
          this.messageSubject.next(data);
        });

        // 에러 처리
        this.socket.on('connect_error', (err) => {
          console.error('Socket.IO 연결 오류:', err);
          toaster.create({
            title: `${getTranslation()('error.socketConnectFailed')}: ${err.message}`,
            type: 'error',
            duration: 3000,
          });
        });

        this.socket.on('disconnect', (reason) => {
          this.currentState = 'CLOSED';
          this.stateSubject.next('CLOSED');
          console.log('Socket.IO 연결 종료:', reason);
        });

        this.socket.on('needRefreshToken', async (err) => {
              await this.RenewAuthCode(
                  this.streamer_id.toString(),
              ).then((res) => {
                      this.socket?.emit(
                          'refreshToken', {
                              token : res
                          }
                      )
                  }
              )
          }
        )

        this.socket.on('error', (err) => {
          console.error('Socket.IO 에러:', err);
          toaster.create({
            title: `${getTranslation()('error.socketError')}: ${err.message || err}`,
            type: 'error',
            duration: 3000,
          });
        })
        
        // this.socket.on('start', () => {
        // })
        // this.socket.on('audio', () => {
        // })
        // this.socket.on('text', () => {
        // })
        

        // 실제 연결 시작
        this.socket.connect();
      }
      catch {
        throw "Cannot"
      }
    }


    async connect(url: string, options: object = {}) {
      // 반드시 Auth가 성공했을때만 들어오는것으로 변경
    if (this.socket?.connected) {
      this.disconnect();
    }


    try {
    
      this.currentState = 'CONNECTING';
      this.stateSubject.next('CONNECTING');

      const result = true
      // const result = await this.Authenticate(
      //   'a', 
      //   20
      // )


      console.log()
      this.changeAuthenticationState(
        result ? result : false
      )
    
      
    } catch (error) {
      console.error('Socket.IO 연결 생성 실패:', error);
      this.currentState = 'CLOSED';
      this.stateSubject.next('CLOSED');
      toaster.create({
        title: getTranslation()('error.socketInitFailed'),
        type: 'error',
        duration: 2000,
      });
    }
  }


  // 메시지 보내기 (기존 sendMessage와 호환)
  emit(event: string, data: object = {}) {
    console.log("emit 한다?")

    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`네트워크 연결이 완료되지 않았음, "${event}"`);
      toaster.create({
        title: getTranslation()('error.socketNotConnected'),
        type: 'error',
        duration: 2000,
      });
    }
  }

  // 편의 메서드 (기존 sendMessage와 동일한 이름으로 사용 가능)
  sendMessage(message: Record<string, any>) {

    this.emit(message['topic'], message['content']);
    // this.emit(message.type, message);
  }




  onMessage(callback: (message: MessageEvent) => void) {
    return this.messageSubject.subscribe(callback);
  }

  onText(callback: (message: SocketIOPayload) => void) {
    return this.payloadSubject.subscribe(callback);
  }
  onAudio(callback: (message: SocketIOPayload) => void) {
    return this.payloadSubject.subscribe(callback);
  }
  onStart(callback: (message: SocketIOPayload) => void) {
    return this.payloadSubject.subscribe(callback);
  }
  onEnd(callback: (message: SocketIOPayload) => void) {
    return this.payloadSubject.subscribe(callback);
  }
  onEmotion(callback: (message: SocketIOPayload) => void) {
    return this.payloadSubject.subscribe(callback);
  }

  onStateChange(callback: (state: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED') => void) {
    return this.stateSubject.subscribe(callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getCurrentState() {
    return this.currentState;
  }

  // 필요 시 특정 이벤트 리스너 추가하고 싶을 때
  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }
}

// export const socketService = WebSocketService.getInstance();
export const wsService = WebSocketService.getInstance();
