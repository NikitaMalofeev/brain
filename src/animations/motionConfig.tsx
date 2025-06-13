import React from 'react';
import { MotionConfig } from 'framer-motion';

export const AppMotionProvider = ({ children }: { children: React.ReactNode }) => (
    <MotionConfig
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
        reducedMotion="user"
    >
        {children}
    </MotionConfig>
); 