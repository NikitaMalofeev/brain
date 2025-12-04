import React from 'react';

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
  return (
    <div className={`background-video-container ${className}`}>
      <video
        className="background-video"
        autoPlay
        muted
        loop
        playsInline
        poster={fallbackImageSrc}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
};

export default BackgroundVideo;
