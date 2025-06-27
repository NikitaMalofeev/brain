import { Link, useLocation } from 'react-router-dom';
import { Ripple } from "@/components/ui/Ripple/Ripple.tsx";

const TokenErrorPage = () => {
    const location = useLocation();
    const { error } = location.state || {};

    // Определяем тип ошибки
    const isNoAccessError = !error;

    const title = isNoAccessError ?
        <span>Приложение<br /> доступно только<br /> ученикам программы Brain Programming<br /></span> : 'Ошибка активации доступа';

    return (
        <div className="flex flex-col py-6 justify-between gap-6 items-center min-h-screen bg-[linear-gradient(180deg,_#D5D9F4_0%,_#E3E0F7_33.65%,_#EDF7FE_68.27%,_#E8F1FD_100%)]">
            <div className={'flex flex-col items-center gap-5'}>
                <img src={'/hand.png'} alt={''} className={'w-[250px]'} />
                <h1 className={'font-bold text-2xl px-4 leading-6 text-center text-black'}>{title}</h1>
                <p className={'text-black px-4 text-center'}>Присоединяйтесь к обучению и откройте для себя все возможности своего мозга и жизни</p>
            </div>
            <div className="w-full max-w-xs px-4">
                <Ripple className="rounded-3xl overflow-hidden">
                    <a className={'block w-full'} href={'https://t.me/katyaasta'} target={'_blank'}>
                        <button
                            className={'w-full text-white font-bold p-4 rounded-full bg-[linear-gradient(135deg,rgba(141,197,241,0.4)_-48.61%,#63ABE6_105.56%),linear-gradient(91.99deg,#F3F3F3_0%,#EAEAEA_100%)]'}>
                            Обратиться в отдел заботы
                        </button>
                    </a>
                </Ripple>
            </div>

            {/*<div className="error-card">
                <h1>{title}</h1>

                <div className="button-group">
                    <button onClick={handleSupportClick} className="support-button">
                        Обратиться в отдел заботы
                    </button>
                </div>
            </div>*/}
        </div>
    );
};

export default TokenErrorPage; 