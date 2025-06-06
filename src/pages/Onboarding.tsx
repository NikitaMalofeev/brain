import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import {getKinescopeId} from "@/components/LessonContent/VideoBlock.tsx";
import VideoPlayer from "@/components/Player/VideoPlayer.tsx";

const slides = [
    { title: 'Добро пожаловать', description: 'Это вводное видео поможет тебе быстро разобраться в устройстве курса и возможностях приложения. Посмотри его до конца, чтобы начать обучение на полной скорости.', img: '' },
    { title: 'Главная', description: 'Главная страница — это твой личный центр управления. Здесь ты видишь свой прогресс, баллы и путь по ступеням курса.', img: '/o1.jpg' },
    { title: 'Библиотека', description: 'Библиотека — это центр твоего обучения. Здесь ты смотришь и слушаешь материалы, а после сразу выполняешь домашние задания. Всё, что нужно для погружения и практики в одном месте.', img: '/o2.jpg' },
    { title: 'Профиль', description: 'Профиль — твоя личная навигация. Здесь всё важное под рукой: чаты, помощь, FAQ и твои эдельштейны. Заглядывай сюда, когда нужен быстрый доступ или поддержка.\n', img: '/o3.jpg' },
];

export const Onboarding = ({ onClose }: {onClose: () => void})=>  {
    const swiperRef = useRef<any>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleNext = () => {
        if (swiperRef.current && swiperRef.current.swiper) {
            if(swiperRef.current.swiper.isEnd){
                onClose()
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
                            </div> : <img alt={''} className={'max-h-[375px] aspect-square w-full object-cover'} src={slide.img}/>}
                            <div className={'flex flex-col gap-1 items-center px-4'}>
                                <h2 className="w-max  text-2xl font-bold">{slide.title}</h2>
                                <p className="text-center text-sm text-[#242424]">{slide.description}</p>
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
                        className={`w-[10px] h-[10px] rounded-full transition-colors duration-300 ${
                            activeIndex >= index ? 'bg-gradient-to-tr from-[#E1C1F4] to-[#B862EA]' : 'bg-[#E7DBEF]'
                        }`}
                    ></div>
                ))}
            </div>

            {/* Кнопка Далее */}
            <div className="p-4">
                <button
                    onClick={handleNext}
                    className="font-bold w-full leading-5 text-white py-4 rounded-3xl text-center bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]"
                >
                    {activeIndex === 3 ? "Все понятно" : "Далее"}
                </button>
            </div>
        </div>
    );
}

export default Onboarding;