import { useEffect } from 'react';

interface IFrameSplashProps {
    onDone: () => void;
}

export default function IFrameSplash({ onDone }: IFrameSplashProps) {
    useEffect(() => {
        const id = setTimeout(onDone, 6000); // 6 секунд
        return () => clearTimeout(id);
    }, [onDone]);

    return (
        <div onClick={onDone} className="fixed inset-0 z-50 overflow-hidden bg-white flex items-center justify-center">
            <iframe

                src="https://3dbrain-three.vercel.app/"
                className="w-full h-full border-0 max-w-screen max-h-screen"
                // блокируем user-инпут, чтобы никто не кликал внутрь
                sandbox="allow-scripts"   // без allow-pointer-lock / same-origin
                aria-hidden="true"
                style={{ aspectRatio: '16/9' }}
            />
        </div>
    );
} 