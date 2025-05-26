import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';

const slides = [
    { title: 'Добро пожаловать', description: 'Краткое описание', img: '🎬' },
    { title: 'Главная', description: 'Краткое описание', img: '🏠' },
    { title: 'Библиотека', description: 'Краткое описание', img: '📚' },
    { title: 'Профиль', description: 'Краткое описание', img: '👤' },
];

export default function Onboarding({ onClose }) {
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
        <div className="h-screen flex flex-col justify-between bg-white z-[100] ">

            {/* Слайдер */}
            <Swiper
                ref={swiperRef}
                modules={[Pagination]}
                spaceBetween={50}
                slidesPerView={1}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                className="flex-1 w-90"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index} >
                        <div className="flex flex-col items-center justify-center p-4 text-black pt-10 gap-4">
                            <div className={'w-80 bg-gray-200 h-80 rounded-xl'}>

                            </div>
                            <div className={'flex flex-col gap-1 items-center'}>
                                <h2 className="w-max  text-lg font-semibold">{slide.title}</h2>
                                <p className="w-max text-center text-sm text-gray-500">{slide.description}</p>
                            </div>
                        </div>

                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Точки */}
            <div className="flex justify-center gap-2 mb-4">
                {slides.map((_, index) => (
                    <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                            activeIndex === index ? 'bg-black' : 'bg-gray-300'
                        }`}
                    ></div>
                ))}
            </div>

            {/* Кнопка Далее */}
            <div className="p-4">
                <button
                    onClick={handleNext}
                    className="w-full bg-black text-white py-3 rounded text-center rounded-xl"
                >
                    Далее
                </button>
            </div>
        </div>
    );
}
