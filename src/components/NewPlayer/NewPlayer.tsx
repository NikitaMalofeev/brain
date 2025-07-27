import { useRef, useState } from 'react';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { AudioWaveform } from './AudioWaveform';
import type { AudioWaveformData } from '@/lib/supabase/types';

// SVG иконки для Play и Pause
const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M6 17.3336V6.66698C6 5.78742 6 5.34715 6.18509 5.08691C6.34664 4.85977 6.59564 4.71064 6.87207 4.67499C7.18868 4.63415 7.57701 4.84126 8.35254 5.25487L18.3525 10.5882L18.3562 10.5898C19.2132 11.0469 19.642 11.2756 19.7826 11.5803C19.9053 11.8462 19.9053 12.1531 19.7826 12.4189C19.6418 12.7241 19.212 12.9537 18.3525 13.4121L8.35254 18.7454C7.57645 19.1593 7.1888 19.3657 6.87207 19.3248C6.59564 19.2891 6.34664 19.1401 6.18509 18.9129C6 18.6527 6 18.2132 6 17.3336Z"
            fill="url(#paint0_linear_1056_751)" />
        <defs>
            <linearGradient id="paint0_linear_1056_751" x1="11.0982" y1="10.3593" x2="12.1454" y2="-3.89361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="white" />
                <stop offset="1" stopColor="white" stopOpacity="0.45" />
            </linearGradient>
        </defs>
    </svg>
);

const PauseIcon = () => (
    <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white" />
    </svg>
);

interface NewPlayerProps {
    audioUrl: string;
    waveformData?: AudioWaveformData;
}

const NewPlayer = ({ audioUrl, waveformData }: NewPlayerProps) => {
    console.log('NewPlayer render:', { audioUrl, waveformData });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState('0:00');

    // Функция для форматирования времени из секунд в ММ:СС
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleSeek = (percent: number) => {
        if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = percent * audioRef.current.duration;
        }
    };

    // Если есть данные волны, сразу показываем длительность
    if (waveformData?.duration && duration === '0:00') {
        setDuration(formatTime(waveformData.duration));
    }

    return (
        <div className={'border border-[#595959]/14 p-4 rounded-full flex items-center gap-3'}>
            <Ripple className="rounded-full overflow-hidden inline-block">
                <button
                    onClick={handlePlayPause}
                    className="outline-none p-2 rounded-full bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)] cursor-pointer"
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
            </Ripple>
            
            <div className={'h-8 flex-1 relative'} style={{ minWidth: 0 }}>
                {waveformData ? (
                    <>
                        {console.log('Rendering AudioWaveform with:', waveformData)}
                        <AudioWaveform
                            waveformData={waveformData}
                            progress={progress}
                            onSeek={handleSeek}
                            height={32}
                        />
                    </>
                ) : (
                    <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: '#f0f0f0',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                    }}>
                        No waveform data
                    </div>
                )}
            </div>
            
            <span className={'text-xs text-[#9F9F9F]'}>{duration}</span>
            
            {/* Скрытый audio элемент */}
            <audio
                ref={audioRef}
                preload="none"
                style={{ display: 'none' }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => {
                    const audio = e.currentTarget;
                    if (audio.duration) {
                        setProgress((audio.currentTime / audio.duration) * 100);
                    }
                }}
                onLoadedMetadata={(e) => {
                    const audio = e.currentTarget;
                    setDuration(formatTime(audio.duration));
                }}
            >
                <source src={audioUrl} type="audio/mpeg" />
            </audio>
        </div>
    );
};

export default NewPlayer;