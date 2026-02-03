import {
  createContext, useContext, useState, useMemo
} from 'react';
import { useLocalStorage } from '@/hooks/utils/use-local-storage';
import { useConfig } from '@/context/character-config-context';

/**
 * Model emotion mapping interface
 * @interface EmotionMap
 */
interface EmotionMap {
  [key: string]: number | string;
}

/**
 * Motion weight mapping interface
 * @interface MotionWeightMap
 */
export interface MotionWeightMap {
  [key: string]: number;
}

/**
 * Tap motion mapping interface
 * @interface TapMotionMap
 */
export interface TapMotionMap {
  [key: string]: MotionWeightMap;
}

/**
 * Live2D model information interface
 * @interface ModelInfo
 */
export interface ModelInfo {
  /** Model name */
  name?: string;

  /** Model description */
  description?: string;

  /** Model URL */
  url: string;

  /** Scale factor */
  kScale: number;

  /** Initial X position shift */
  initialXshift: number;

  /** Initial Y position shift */
  initialYshift: number;

  /** Idle motion group name */
  idleMotionGroupName?: string;

  /** Default emotion */
  defaultEmotion?: number | string;

  /** Emotion mapping configuration */
  emotionMap: EmotionMap;

  /** Enable pointer interactivity */
  pointerInteractive?: boolean;

  /** Tap motion mapping configuration */
  tapMotions?: TapMotionMap;

  /** Enable scroll to resize */
  scrollToResize?: boolean;

  /** Initial scale */
  initialScale?: number;
}

/**
 * Live2D configuration context state interface
 * @interface Live2DConfigState
 */
interface Live2DConfigState {
  modelInfo?: ModelInfo;
  setModelInfo: (info: ModelInfo | undefined) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

/**
 * Default values and constants
 */
const baseText : string = '{"type":"set-model-and-conf","model_info":{"name":"mao_pro","description":"","url":"/live2d-models/mao_pro/runtime/mao_pro.model3.json","kScale":0.5,"initialXshift":0,"initialYshift":0,"kXOffset":1150,"idleMotionGroupName":"Idle","emotionMap":{"neutral":0,"anger":2,"disgust":2,"fear":1,"joy":3,"smirk":3,"sadness":1,"surprise":3},"tapMotions":{"HitAreaHead":{"":1},"HitAreaBody":{"":1}}},"conf_name":"mao_pro","conf_uid":"mao_pro_001","client_uid":"93173c76-000d-401f-875d-a40ec5925f31"}'
const DEFAULT_CONFIG = {
  modelInfo: {
    ... JSON.parse(baseText).model_info,
    scrollToResize: true,
  } as ModelInfo | undefined,
  isLoading: false,
};

console.log("DEFAULT_CONFIG.modelInfo", DEFAULT_CONFIG.modelInfo)
console.log("DEFAULT_CONFIG.modelInfo", DEFAULT_CONFIG.modelInfo)

/**
 * Create the Live2D configuration context
 */
export const Live2DConfigContext = createContext<Live2DConfigState | null>(null);

/**
 * Live2D Configuration Provider Component
 * @param {Object} props - Provider props
 * @param {React.ReactNode} props.children - Child components
 */
export function Live2DConfigProvider({ children }: { children: React.ReactNode }) {
  const { confUid } = useConfig();

  const [isLoading, setIsLoading] = useState(DEFAULT_CONFIG.isLoading);

  const [modelInfo, setModelInfoState] = useLocalStorage<ModelInfo | undefined>(
    "modelInfo",
    DEFAULT_CONFIG.modelInfo,
    {
      filter: (value) => (value ? { ...value, url: "" } : value),
    },
  );
  // setModelInfoState(DEFAULT_CONFIG.modelInfo)
  // const [modelInfo, setModelInfoState] = useState<ModelInfo | undefined>(DEFAULT_CONFIG.modelInfo);
  const baseText : string = '{"type":"set-model-and-conf","model_info":{"name":"mao_pro","description":"","url":"/live2d-models/mao_pro/runtime/mao_pro.model3.json","kScale":0.5,"initialXshift":0,"initialYshift":0,"kXOffset":1150,"idleMotionGroupName":"Idle","emotionMap":{"neutral":0,"anger":2,"disgust":2,"fear":1,"joy":3,"smirk":3,"sadness":1,"surprise":3},"tapMotions":{"HitAreaHead":{"":1},"HitAreaBody":{"":1}}},"conf_name":"mao_pro","conf_uid":"mao_pro_001","client_uid":"93173c76-000d-401f-875d-a40ec5925f31"}'
  const setModelInfo = (info: ModelInfo | undefined) => {
    // Always use the scale defined in the incoming info object (from config)
    if (!info?.url) {

      info = JSON.parse(
        baseText
      )
      
      const finalScale = info ? Number(info.kScale || 0.5) * 2 : 1;
      setModelInfoState(
        {
          ... JSON.parse(
          baseText
          ),
          kScale: finalScale,
          pointerInteractive:
            info && "pointerInteractive" in info
              ? info.pointerInteractive
              : (modelInfo?.pointerInteractive ?? true),
          scrollToResize:
            info && "scrollToResize" in info
              ? info.scrollToResize
              : (modelInfo?.scrollToResize ?? true),
            }
      );
      return
    }
    const finalScale = Number(info.kScale || 0.5) * 2;
    console.log("Setting model info with default scale:", finalScale);

    setModelInfoState({
      ...info,
      kScale: finalScale,
      pointerInteractive:
        "pointerInteractive" in info
          ? info.pointerInteractive
          : (modelInfo?.pointerInteractive ?? true),
      scrollToResize:
        "scrollToResize" in info
          ? info.scrollToResize
          : (modelInfo?.scrollToResize ?? true),
    });
  };

  const contextValue = useMemo(
    () => ({
      modelInfo,
      setModelInfo,
      isLoading,
      setIsLoading,
    }),
    [modelInfo, isLoading, setIsLoading],
  );

  return (
    <Live2DConfigContext.Provider value={contextValue}>
      {children}
    </Live2DConfigContext.Provider>
  );
}

/**
 * Custom hook to use the Live2D configuration context
 * @throws {Error} If used outside of Live2DConfigProvider
 */
export function useLive2DConfig() {
  const context = useContext(Live2DConfigContext);

  if (!context) {
    throw new Error('useLive2DConfig must be used within a Live2DConfigProvider');
  }

  return context;
}
// Export the provider as default
export default Live2DConfigProvider;
