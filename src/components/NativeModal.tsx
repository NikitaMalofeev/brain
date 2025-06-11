import { clsx } from "clsx";
import { Ripple } from '@/components/ui/Ripple/Ripple';

interface NativeModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    title: string;
    description: string;
}

export default function NativeModal({ isOpen, setIsOpen, title, description }: NativeModalProps) {

    const closeModal = () => {
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        // Темный фон по всему экрану
        <div className="fixed inset-0 bg-black/40  backdrop-blur-sm flex items-center justify-center z-50">
            {/* Обёртка модалки, задаём позицию относительную, чтобы «крестик» можно было вывести вниз */}
            <div className="relative w-[90%] max-w-md">
                {/* Содержимое модалки */}
                <div className={'flex flex-col gap-3 items-center'}>
                    <div className=" bg-white rounded-2xl py-6 px-4 flex flex-col items-center gap-4">
                        <img
                            src="/test.png"
                            alt="Demo"
                            className="rounded-xl w-full object-cover h-[170px]"
                        />
                        <div className={'flex flex-col gap-1 items-center'}>
                            <h2 className="text-xl font-semibold text-black">{title}</h2>
                            <p className=" text-[#242424]">{description}</p>
                        </div>
                    </div>
                    {/*<div
                    className={'p-[6px] rounded-full bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)] absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 z-[2]'}>
                    <img src={'/lock.svg'} alt={''} className={clsx('min-w-6 h-6')}/>
                </div>*/}
                    <Ripple className="rounded-full overflow-hidden">
                        <button
                            onClick={closeModal}
                            className="
                bg-[linear-gradient(109.65deg,_#E1C1F4_13.64%,_#B862EA_124.92%)]
                rounded-full
                p-[6px]
                cursor-pointer
              "
                        >
                            <img src={'/close.svg'} alt={''} className={clsx('min-w-6 h-6')} />
                        </button>
                    </Ripple>
                </div>
            </div>
        </div>
    );
}
