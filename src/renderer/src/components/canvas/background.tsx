import { Box, Image } from '@chakra-ui/react';
import { memo, useEffect, useRef } from 'react';
import { canvasStyles } from './canvas-styles';
import { useBgUrl } from '@/context/bgurl-context';

const Background = memo(({ children }: { children?: React.ReactNode }) => {

  const { backgroundUrl } = useBgUrl();

  // useEffect(() => {
  //   if (useCameraBackground) {
  //     startBackgroundCamera();
  //   } else {
  //     stopBackgroundCamera();
  //   }
  // }, [useCameraBackground, startBackgroundCamera, stopBackgroundCamera]);



  return (
    <Box {...canvasStyles.background.container}>
      {
      // useCameraBackground ? (
      //   <video
      //     ref={videoRef}
      //     autoPlay
      //     playsInline
      //     muted
      //     style={{
      //       ...canvasStyles.background.video,
      //       display: isBackgroundStreaming ? 'block' : 'none',
      //       transform: 'scaleX(-1)',
      //     }}
      //   />
      // ) :
        (
          <Image
            {...canvasStyles.background.image}
            src={backgroundUrl}
            alt="background"
          />
        )
      }
      {children}
    </Box>
  );
});

Background.displayName = 'Background';

export default Background;
