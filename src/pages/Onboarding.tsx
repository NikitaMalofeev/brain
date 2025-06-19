import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import { getKinescopeId } from "@/components/LessonContent/VideoBlock.tsx";
import VideoPlayer from "@/components/Player/VideoPlayer.tsx";
import { useSupabaseUser } from '@/lib/supabase/hooks';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { Ripple } from '@/components/ui/Ripple/Ripple';

const slides = [
    { title: 'Добро пожаловать', description: 'Просмотри это видео. Оно поможет разобраться, как устроено обучение, что тебя ждёт и какие секретные функции есть в приложении.', img: '' },
    { title: 'Главная', description: 'Главная страница — это твой личный центр управления. Здесь ты видишь свой прогресс, баллы и путь по ступеням курса.', img: '/o1.jpg', icon: '/icon1-active.svg' },
    { title: 'Библиотека', description: 'Библиотека — это центр обучения. Здесь ты найдёшь все материалы: видеоуроки, техники, практики и домашние задания. \n\nЯ уверена, это место станет одним из твоих любимых 🤍', img: '/o2.jpg', icon: '/icon2-active.svg' },
    { title: 'Профиль', description: 'Профиль — твоя личная страница. Здесь я собрала для тебя все самое важное: чаты, твои Эдельштейны, FAQ и связь с отделом заботы, если появятся вопросы.', img: '/o3.jpg', icon: '/icon3-active.svg' },
];

export const Onboarding = ({ onClose }: { onClose: () => void }) => {
    const swiperRef = useRef<any>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Получаем доступ к функции отметки завершения онбординга
    const initData = useSignal(initDataState);
    const { markOnboardingCompleted } = useSupabaseUser(initData);

    const handleNext = () => {
        if (swiperRef.current && swiperRef.current.swiper) {
            if (swiperRef.current.swiper.isEnd) {
                // На последнем слайде отмечаем онбординг как завершенный
                markOnboardingCompleted();
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
                modules={[Pagination]}
                spaceBetween={1}
                slidesPerView={1}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                className="flex-1 w-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index} >
                        <div className="flex flex-col items-center justify-center text-black gap-12 pb-4">
                            {index === 0 ? <div className={'h-[330px] w-full'}>
                                <VideoPlayer
                                    videoId={getKinescopeId('https://kinescope.io/oXiWoXBWQpcb3GQ9AARE3Q') || ''}
                                />
                            </div> : <img alt={''} className={'max-h-[375px] aspect-square w-full object-cover'} src={slide.img} />}
                            <div className={'flex flex-col gap-1 items-center px-4 relative'}>
                                {index > 0 && <div
                                    className={'absolute -top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 p-3 rounded-full bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)]'}>
                                    <img className={'w-11 h-11'} src={slide.icon} alt={''} />
                                </div>}
                                <h2 className="w-max text-2xl font-bold">{slide.title}</h2>
                                <p className="text-center text-sm text-[#242424] whitespace-pre-line">{slide.description}</p>
                            </div>
                        </div>

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
            <div className="p-4">
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