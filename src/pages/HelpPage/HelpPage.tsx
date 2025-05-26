import {Page} from "@/components";
import {Link} from "react-router-dom";

export const HelpPage = ()=> {
    const helpers = ['Алена', 'Ваня', 'Макс', 'Маша']
    return(
        <Page>
            <div className={'flex flex-col gap-8 p-4 bg-gray-100 text-black/80 min-h-screen'}>
                <h2 className={'font-bold text-3xl'}>Помощь</h2>
                <div className={'grid grid-cols-2 gap-2'}>
                    {helpers.map((el,i ) => (
                        <Link key={i} className={'p-4 rounded-2xl bg-white flex flex-col gap-2 items-center'} to={'https://t.me/123'}>
                            <div className={'w-16 h-16 rounded-full bg-gray-200'}></div>
                            <p className={'font-bold'}>{el}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </Page>
    )
}