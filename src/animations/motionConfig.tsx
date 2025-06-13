import React from 'react';
import { MotionConfig } from 'framer-motion';

export const AppMotionProvider = ({ children }: { children: React.ReactNode }) => (
    <MotionConfig
        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
        reducedMotion="user"
    >
        {children}
    </MotionConfig>
); 