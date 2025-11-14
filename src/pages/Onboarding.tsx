import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, EffectCreative } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/effect-creative';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { useOnboarding } from '@/lib/hooks/useOnboarding';

// Импортируем изображения
import onbordingMain from '@/shared/assets/images/onbordingMain.png';
import onbordingFirstStep from '@/shared/assets/images/onbordingFirstStep.png';
import onbordingLibrary from '@/shared/assets/images/onbordingLibrary.png';
import onbordingLastStep from '@/shared/assets/images/onbordingLastStep.png';

const slides = [
    {
        title: 'Добро пожаловать',
        description: 'Это вводное видео поможет тебе быстро разобраться в приложении. Посмотри до конца, чтобы начать обучение с полной ясностью.',
        img: onbordingMain
    },
    {
        title: 'Главная',
        description: 'Главная страница — это твой личный центр управления. Здесь ты видишь свой прогресс, баллы и путь по ступеням курса.',
        img: onbordingFirstStep
    },
    {
        title: 'Библиотека',
        description: 'Библиотека — это центр твоего обучения. Здесь ты смотришь материалы, а после сразу выполняешь упражнения и домашние задания. Всё, что нужно для погружения и практики в одном месте.',
        img: onbordingLibrary
    },
    {
        title: 'Профиль',
        description: 'Профиль — твоя личная страница. Здесь всё самое важное под рукой: чаты, помощь, FAQ и связь с отделом заботы, если вдруг нужен быстрый ответ или поддержка.',
        img: onbordingLastStep
    },
];

export const Onboarding = ({ onClose }: { onClose: () => void }) => {
    const swiperRef = useRef<any>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { completeOnboarding } = useOnboarding();

    const handleNext = () => {
        if (swiperRef.current && swiperRef.current.swiper) {
            if (swiperRef.current.swiper.isEnd) {
                // На последнем слайде отмечаем онбординг как завершенный
                completeOnboarding();
                onClose();
            }
            swiperRef.current.swiper.slideNext();
        }
    };


    return (
        <div className="min-h-screen flex flex-col justify-between bg-white z-[100] max-w-[600px] mx-auto">

            {/* Слайдер */}
            <Swiper
                ref={swiperRef}
                modules={[Pagination, EffectCreative]}
                effect="creative"
                creativeEffect={{
                    prev: {
                        translate: ['-100%', 0, -400],
                        opacity: 0,
                    },
                    next: {
                        translate: ['100%', 0, 0],
                        opacity: 0,
                    },
                }}
                spaceBetween={1}
                slidesPerView={1}
                speed={600}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                className="flex-1 w-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index}>
                        <AnimatePresence mode="wait">
                            {activeIndex === index && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex flex-col items-center justify-center text-black gap-8 pb-4 px-4"
                                >
                                    {/* Изображение */}
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1, duration: 0.5 }}
                                        className="w-full max-w-[375px] aspect-square rounded-2xl overflow-hidden"
                                    >
                                        <img
                                            alt={slide.title}
                                            className="w-full h-full object-cover"
                                            src={slide.img}
                                        />
                                    </motion.div>

                                    {/* Текстовый блок */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className="flex flex-col gap-2 items-center px-4"
                                    >
                                        <h2 className="text-2xl font-bold text-center">{slide.title}</h2>
                                        <p className="text-center text-sm text-[#242424] whitespace-pre-line max-w-[340px]">
                                            {slide.description}
                                        </p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Точки */}
            <div className="flex justify-center  gap-1 mb-4">
                {slides.map((_, index) => (
                    <div
                        key={index}
                        className={`w-[10px] h-[10px] rounded-full transition-colors duration-300 ${activeIndex >= index ? 'bg-gradient-to-tr from-[#E1C1F4] to-[#B862EA]' : 'bg-[#E7DBEF]'
                            }`}
                    ></div>
                ))}
            </div>

            {/* Кнопка Далее */}
            <div className="p-4 pb-12">
                <Ripple className="rounded-3xl overflow-hidden">
                    <button
                        onClick={handleNext}
                        className="font-bold w-full leading-5 text-white py-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"
                    >
                        {activeIndex === 3 ? "Все понятно" : "Далее"}
                    </button>
                </Ripple>
            </div>
        </div>
    );
}

export default Onboarding;