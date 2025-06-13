import { FC } from 'react';
import './SafeAreaFade.css';
import { AnimatePresence, motion } from "framer-motion";

interface SafeAreaFadeProps {
  show?: boolean;
}

/**
 * Компонент создает градиентные фейды в верхней и нижней частях экрана
 * Располагается поверх всего контента с высоким z-index
 */
export const SafeAreaFade: FC<SafeAreaFadeProps> = ({ show = true }) => {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="safe-area-fade-top"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="safe-area-fade-bottom"
          />
        </>
      )}
    </AnimatePresence>
  );
}; 