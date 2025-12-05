import React, { useRef, useEffect } from 'react';

interface BackgroundVideoProps {
  videoSrc: string;
  fallbackImageSrc?: string;
  className?: string;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  videoSrc,
  fallbackImageSrc,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Принудительный запуск видео при монтировании
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Пытаемся запустить видео сразу
    const playVideo = async () => {
      try {
        video.muted = true; // Гарантируем что muted
        await video.play();
      } catch (error) {
        console.log('Autoplay prevented, waiting for user interaction');
        // Если автовоспроизведение заблокировано, попробуем при взаимодействии
        const handleInteraction = async () => {
          try {
            await video.play();
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('click', handleInteraction);
          } catch (e) {
            console.error('Video play failed:', e);
          }
        };
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('click', handleInteraction, { once: true });
      }
    };

    playVideo();
  }, [videoSrc]);

  return (
    <div className={`background-video-container ${className}`}>
      <video
        ref={videoRef}
        className="background-video"
        autoPlay
        muted
        loop
        playsInline
        poster={fallbackImageSrc}
        preload="auto"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
};

export default BackgroundVideo;
