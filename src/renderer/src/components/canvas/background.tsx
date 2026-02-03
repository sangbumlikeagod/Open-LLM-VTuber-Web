// import { Box, Image } from '@chakra-ui/react';
// import { memo, useEffect, useRef } from 'react';
// import { canvasStyles } from './canvas-styles';
// import { useBgUrl } from '@/context/bgurl-context';

// const Background = memo(({ children }: { children?: React.ReactNode }) => {

//   const { backgroundUrl } = useBgUrl();

//   // useEffect(() => {
//   //   if (useCameraBackground) {
//   //     startBackgroundCamera();
//   //   } else {
//   //     stopBackgroundCamera();
//   //   }
//   // }, [useCameraBackground, startBackgroundCamera, stopBackgroundCamera]);



//   return (
//     <Box {...canvasStyles.background.container}>
//       {
//       // useCameraBackground ? (
//       //   <video
//       //     ref={videoRef}
//       //     autoPlay
//       //     playsInline
//       //     muted
//       //     style={{
//       //       ...canvasStyles.background.video,
//       //       display: isBackgroundStreaming ? 'block' : 'none',
//       //       transform: 'scaleX(-1)',
//       //     }}
//       //   />
//       // ) :
//         (
//           <Image
//             {...canvasStyles.background.image}
//             src={backgroundUrl}
//             alt="background"
//           />
//         )
//       }
//       {children}
//     </Box>
//   );
// });

// Background.displayName = 'Background';

// export default Background;


'use client';

import { Box, Image, AspectRatio } from '@chakra-ui/react';
import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { canvasStyles } from './canvas-styles';
import { useBgUrl } from '@/context/bgurl-context';

const Background = memo(({ children }: { children?: React.ReactNode }) => {
  const { backgroundUrl } = useBgUrl();
  
  // 더블 버퍼링을 위한 상태
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const [videoUrlA, setVideoUrlA] = useState<string | null>(null);
  const [videoUrlB, setVideoUrlB] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);

  // url이 비디오인지 판단 (대소문자 무시 + 쿼리스트링 고려)
  const isVideo = useMemo(() => {
    if (!backgroundUrl) return false;
    const lower = backgroundUrl.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.includes('.mp4?') ||
      lower.includes('.webm?') ||
      lower.includes('.mov?')
    );
  }, [backgroundUrl]);

  // 비디오 URL 변경 시 더블 버퍼링 처리
  useEffect(() => {
    if (!isVideo || !backgroundUrl) return;
    
    // 같은 URL이면 무시
    if (backgroundUrl === videoUrlA || backgroundUrl === videoUrlB) return;
    
    // 비활성 버퍼에 새 URL 로드
    if (activeVideo === 'A') {
      setVideoUrlB(backgroundUrl);
    } else {
      setVideoUrlA(backgroundUrl);
    }
  }, [backgroundUrl, isVideo]);

  // 비디오 로드 완료 시 전환
  const handleCanPlay = (buffer: 'A' | 'B') => {
    // 비활성 버퍼가 로드 완료되면 전환
    if (buffer !== activeVideo) {
      setIsTransitioning(true);
      
      // 새 비디오 재생 시작
      if (buffer === 'A') {
        videoRefA.current?.play();
      } else {
        videoRefB.current?.play();
      }
      
      // 전환 후 active 버퍼 변경
      setTimeout(() => {
        setActiveVideo(buffer);
        setIsTransitioning(false);
      }, 300); // 트랜지션 시간과 맞춤
    }
  };

  const videoStyle = {
    ...canvasStyles.background.video,
    objectFit: 'scale-down' as const,
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    transition: 'opacity 0.3s ease-in-out',
  };

  return (
    <Box {...canvasStyles.background.container}>
      {backgroundUrl ? (
        isVideo ? (
          // 비디오일 경우 - 더블 버퍼링
          <AspectRatio ratio={16 / 9} width="100%" height="100%">
            <Box position="relative" width="100%" height="100%">
              {/* 버퍼 A */}
              {videoUrlA && (
                <video
                  ref={videoRefA}
                  autoPlay={activeVideo === 'A'}
                  loop
                  muted
                  playsInline
                  src={videoUrlA}
                  onCanPlay={() => handleCanPlay('A')}
                  style={{
                    ...videoStyle,
                    opacity: activeVideo === 'A' || (isTransitioning && activeVideo === 'B') ? 1 : 0,
                    zIndex: activeVideo === 'A' ? 1 : 0,
                  }}
                />
              )}
              {/* 버퍼 B */}
              {videoUrlB && (
                <video
                  ref={videoRefB}
                  autoPlay={activeVideo === 'B'}
                  loop
                  muted
                  playsInline
                  src={videoUrlB}
                  onCanPlay={() => handleCanPlay('B')}
                  style={{
                    ...videoStyle,
                    opacity: activeVideo === 'B' || (isTransitioning && activeVideo === 'A') ? 1 : 0,
                    zIndex: activeVideo === 'B' ? 1 : 0,
                  }}
                />
              )}
            </Box>
          </AspectRatio>
        ) : (
          // 이미지일 경우
          <Image
            {...canvasStyles.background.image}
            src={backgroundUrl}
            alt="background"
            objectFit="cover"
            width="100%"
            height="100%"
          />
        )
      ) : null}

      {children}
    </Box>
  );
});

Background.displayName = 'Background';

export default Background;