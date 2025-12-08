import { useEffect, useRef, useState } from 'react';
import { TypeAnimation } from 'react-type-animation';

interface IFrameSplashProps {
    onDone: () => void;
}

export default function IFrameSplash({ onDone }: IFrameSplashProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        const id = setTimeout(onDone, 6000); // 6 секунд
        return () => clearTimeout(id);
    }, [onDone]);

    useEffect(() => {
        if (videoRef.current) {
            // Пробуем автозапускать видео (если не сработало — showFallback)
            videoRef.current.play().catch(() => setShowFallback(true));
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden bg-[rgba(224,231,251,1)] flex items-center justify-center">
            <div
                onClick={onDone}
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    cursor: 'pointer',
                    zIndex: 1000,
                    background: 'transparent'
                }}
            />
            <div className={'relative bg-[rgba(224,231,251,1)]'}>
                {/* Левый градиент */}
                <div
                    className="absolute top-0 left-0 h-full w-[100px] pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to right, rgba(224,231,251,1) 0%, rgba(224,231,251,0) 100%)'
                    }}
                />
                {/* Правый градиент */}
                <div
                    className="absolute top-0 right-0 h-full w-[100px] pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to left, rgba(224,231,251,1) 0%, rgba(224,231,251,0) 100%)'
                    }}
                />
                <div
                    className="absolute bottom-0 right-0 h-[100px] w-full pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to top, rgba(224,231,251,1) 0%, rgba(224,231,251,1) 80%, rgba(224,231,251,0) 100%)'
                    }}
                />
                {showFallback ? (
                    <img
                        src="/brain-fallback.jpg"
                        alt="Brain fallback"
                        className="w-full h-full object-contain"
                        style={{ background: "#000" }}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        className={'w-full h-full object-contain'}
                        src="/brain.mp4"        /* или CDN-ссылка */
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                )}
            </div>

            {/* Текст вынесен из видео-контейнера для надежного позиционирования */}
            <div className="absolute bottom-16 left-0 right-0 z-[100]">
                <h2 className="text-black text-center text-4xl font-bold w-full">
                    <TypeAnimation
                        sequence={[
                            'Brain Programming Activated',
                        ]}
                        className={'max-w-full'}
                        cursor={false}
                        wrapper="span"
                        speed={10}
                    />
                </h2>
            </div>
        </div>
    );
}
