import {Page} from "@/components";

const rewards = [
    {
        id: 1,
        title: 'Отчеты по заданиям',
        quantity: 10,
        description: 'Каждому из вашей мини-группы, когда все 10 человек сдали ежедневные отчеты = вся команда получила 100 баллов. Для этого обязательно указываем в сообщении хештег #отчет и хештег с номером дз. Например #отчет #дз36'
    },
    {
        id: 2,
        title: 'Финансовый результат',
        quantity: 5,
        description: 'Когда кто-то из ее участников поделился своим финансовым результатом, приходом легких денег/новых поступлений с хештегом #финансы.'
    },
    {
        id: 3,
        title: 'Созвон в десятке',
        quantity: 10,
        description: 'Когда кто-то из ее участников поделился своим финансовым результатом, приходом легких денег/новых поступлений с хештегом #финансы . '
    },
    {
        id: 4,
        title: 'Результат',
        quantity: 3,
        description: 'Поделитесь своим результатом с хештегом #результат с развернутым рассказом о том, что у вас получилось. Начисляется каждому ученику в копилку его 10ки.'
    }
]
export const InfoPoints = () => {
    return (
        <Page>
            <div className={'text-black flex flex-col gap-6'}>
                <div
                    className={'relative flex p-5 items-end rounded-b-3xl bg-[url("/bg3.jpg")] bg-cover bg-bottom h-[328px] overflow-hidden'}>
                    <img src={'/ed.png'} alt={''}
                         className={'object-cover w-[404px] -rotate-[24deg] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}/>
                    <div className={'p-3 rounded-full overflow-hidden bg-white'}>
                        <img src={'/eid.svg'} alt={''} className={'w-[38px] h-[38px]'}/>
                    </div>
                </div>
                <p className={'px-4 font-bold text-xl '}>
                    Эдельштейны - наша внутренняя валюта, за которую можно будет получить призы.
                </p>
                <div
                    className={'mx-4 bg-[linear-gradient(91.99deg,_#F7F7F7_0%,_#F3F3F3_100%)] p-4 rounded-2xl flex flex-col gap-3'}>
                    <h3 className={'font-semibold text-xl'}>Получить их можно за:</h3>
                    {rewards.map(el => (<div className={'flex flex-col gap-1'}>
                        <div className={'flex items-center gap-4 justify-between'}>
                            <p className={'font-medium'}>{el.title}</p>
                            <div>
                                <div className={'flex items-center gap-1 py-[6px] px-2 bg-white rounded-full'}>
                                    <p className={'text-black font-semibold leading-4'}>+{el.quantity}</p>
                                    <img src={'/eid.svg'} className={'w-5 h-5'}/></div>
                            </div>
                        </div>
                        <p className={'text-[#9F9F9F] text-sm'}>{el.description}</p>
                    </div>))}
                </div>
                <p className={'px-4'}>Чтобы трекер зачислил вам Эдельштейны, необходимо написать отчет по домашним
                    заданиям/финансовым
                    результатам/созвонам с командой в общий чат. Каждый из вас влияет на общее количество Эдельштейнов в
                    своей мини-группе!))</p>
            </div>
        </Page>
    )
}