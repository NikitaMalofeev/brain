import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import { clsx } from 'clsx';

interface RippleEffect {
    id: number;
    size: number;
    top: number;
    left: number;
}

interface RippleProps {
    children: React.ReactNode;
    className?: string;
}

export const Ripple: React.FC<RippleProps> = ({ children, className }) => {
    const [ripples, setRipples] = useState<RippleEffect[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const createRipple = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        let x: number, y: number;

        if ('touches' in event) {
            // Touch event
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
        } else {
            // Mouse event
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }

        const newRipple: RippleEffect = {
            id: Date.now(),
            size,
            top: y - size / 2,
            left: x - size / 2,
        };

        setRipples(prev => [...prev, newRipple]);
    };

    const handleAnimationEnd = (id: number) => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
    };

    return (
        <div
            ref={containerRef}
            className={clsx('ripple-surface', className)}
            onMouseDown={createRipple as (e: MouseEvent<HTMLDivElement>) => void}
            onTouchStart={createRipple as (e: TouchEvent<HTMLDivElement>) => void}
        >
            {children}
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="ripple-effect"
                    style={{
                        width: ripple.size,
                        height: ripple.size,
                        top: ripple.top,
                        left: ripple.left,
                    }}
                    onAnimationEnd={() => handleAnimationEnd(ripple.id)}
                />
            ))}
        </div>
    );
}; 