import {Page} from "@/components";
import {Link} from "react-router-dom";

export const HelpPage = ()=> {
    const helpers = ['Алена', 'Ваня', 'Макс', 'Маша']
    return(
        <Page>
            <div className={'flex flex-col gap-2  text-black min-h-screen'}>
                <h2 className={'font-bold text-xl p-4'}>Помощь</h2>
                <div className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    <Link to={'https://t.me/123'} className={'p-4 rounded-3xl bg-white flex items-center gap-3'}>
                        <img src={'/woman.png'} alt={''} className={'w-12 h-12 rounded-full object-cover'}/>
                        <div className={'flex flex-col flex-1'}>
                            <p className={'font-semibold'}>Алена</p>
                            <p className={'text-sm font-medium text-[#9F9F9F]'}>Ваш куратор</p>
                        </div>
                        <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'}/>
                    </Link>
                    <div className={'grid grid-cols-2 gap-3'}>
                    {helpers.map((el, i) => (
                            <Link key={i} className={'p-4 rounded-3xl bg-white flex flex-col gap-2 items-center'}
                                  to={'https://t.me/123'}>
                                <div className={'w-12 h-12 rounded-full bg-[#EEEEEE]'}></div>
                                <p className={'font-semibold'}>{el}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Page>
    )
}