import { Page } from "@/components/Page";

const rewards = [
    {
        id: 1,
        title: 'Ежедневные отчеты',
        quantity: 10,
        description: 'Выполняйте задания и делитесь отчетом в чате обучения. Не забудьте добавить хэштеги #отчет #дзN , где N - номер задания'
    },
    {
        id: 2,
        title: 'Финансовый рост',
        quantity: 5,
        description: 'Делитесь своими финансовыми успехами в чате с хэштегом #финансы. Отмечайте не только рост дохода, но и подарки, неожиданные деньги, возврат долга. Все, что связано с увеличением вашего материального достатка',
    },
    {
        id: 3,
        title: 'Созвон в десятке',
        quantity: 10,
        description: 'Начисляются каждому из вашей команды-десятки за участие в еженедельном созвоне. В отчёте поделитесь тем, как прошло ваше общение, что вы вынесли для себя после встречи и не забудьте поставить хештег #созвон',
    },
    {
        id: 4,
        title: 'Результат',
        quantity: 3,
        description: 'В чате обучения делитесь своими изменениями. Важны даже самые маленькие шаги. Ведь именно они потом превращаются в новые большие этапы. Поэтому рассказывайте о своих новых ощущениях, событиях в жизни и материальных результатах.'
    }
]
export const InfoPoints = () => {
    return (
        <Page>
            <div className={'text-black flex flex-col gap-6'}>
                <div
                    className={'page-bg-container relative flex p-5 items-end rounded-b-3xl bg-[url("/bg3.jpg")] bg-cover bg-right-top h-[328px] overflow-hidden'}>

                    <img src={'/coin1.png'} alt={''} className={'w-[304px] absolute -bottom-[110px] right-[8px] coin coin1'} />
                    <img src={'/coin2.png'} alt={''} className={'w-[253px] absolute top-0 left-1/2 -translate-x-1/2 coin coin2'} />
                    <img src={'/coin3.png'} alt={''} className={'w-[220px] absolute top-[90px] -left-[50px] coin coin3'} />
                    <img src={'/coin4.png'} alt={''}
                        className={'w-[115px] absolute -bottom-[70px] top-[86px] -right-[30px] coin coin4'} />
                    <img src={'/coin5.png'} alt={''} className={'w-[75px] absolute bottom-[70px] -right-[30px] coin coin5'} />
                    <img src={'/coin6.png'} alt={''} className={'w-[120px] absolute top-0 right-[30px] coin coin6'} />
                    <img src={'/coin7.png'} alt={''} className={'w-[123px] absolute -top-[30px] left-[10px] coin coin7'} />
                    <div className={'p-3 rounded-full overflow-hidden bg-white relative z-50'}>
                        <img src={'/eid.svg'} alt={''} className={'w-[38px] h-[38px]'} />
                    </div>
                </div>
                <p className={'px-4 font-bold text-xl '}>
                    Эдельштейны — наша внутренняя валюта. Вы можете обменять её на ценные призы.
                </p>
                <div
                    className={'mx-4 bg-[linear-gradient(91.99deg,_#F7F7F7_0%,_#F3F3F3_100%)] p-4 rounded-2xl flex flex-col gap-3'}>
                    <h3 className={'font-bold text-xl'}>Как заработать Эдельштейны:</h3>
                    {rewards.map(el => (<div className={'flex flex-col gap-1'}>
                        <div className={'flex items-center gap-4 justify-between'}>
                            <p className={'font-medium'}>{el.title}</p>
                            <div>
                                <div className={'flex items-center gap-1 py-[6px] px-2 bg-white rounded-full'}>
                                    <p className={'text-black font-semibold leading-4'}>+{el.quantity}</p>
                                    <img src={'/eid.svg'} className={'w-5 h-5'} /></div>
                            </div>
                        </div>
                        <p className={'text-[#9F9F9F] text-sm'}>{el.description}</p>
                    </div>))}
                </div>
                <p className={'px-4'}>Чтобы трекер начислил вам Эдельштейны - пишите сообщение с хэштегом в общий чат.
                    Каждый из вас влияет на общее количество Эдельштейнов в своей мини-группе.
                    Чем больше вы заработаете - тем больше возможностей для выбора приза у вас будет 🤍
                </p>
            </div>
        </Page>
    )
}