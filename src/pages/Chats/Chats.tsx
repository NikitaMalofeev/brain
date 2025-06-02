import { Page } from "@/components";
import { Link } from "react-router-dom";

export const Chats = () => {
    const chats = [
        {
            title: "Общий чат",
            description: "Очень краткое описание чата, его целей, правил, активности",
            link: 'https://t.me/+mCueefdhh6Q3MDcy'
        },
        {
            title: "Chat 2",
            description: "Очень краткое описание чата, его целей, правил, активности",
            link: 'https://t.me/123'
        },
        {
            title: "Chat 3",
            description: "Очень краткое описание чата, его целей, правил, активности",
            link: 'https://t.me/123'
        },
        {
            title: "Chat 4",
            description: "Очень краткое описание чата, его целей, правил, активности",
            link: 'https://t.me/123'
        }
    ]
    return (
        <Page>

            <div className={'flex flex-col gap-2  text-black min-h-screen'}>
                <h2 className={'font-bold text-xl p-4'}>Важные чаты</h2>
                <div className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    {chats.map(el => (
                        <Link className={'p-4 rounded-3xl bg-white flex items-center justify-between gap-3'} to={el.link}>
                            <div className={'flex items-center gap-3'}>
                                <div className={'min-w-[48px] h-[48px] bg-gray-200 rounded-full'}>

                                </div>
                                <div className={'flex flex-col gap-1'}>
                                    <p className={' font-semibold'}>{el.title}</p>
                                    <p className={'text-sm font-medium text-[#9F9F9F]'}>{el.description}</p>
                                </div>
                            </div>
                            <img src={'/arrow-icon.svg'} alt="" className={'w-[36px] h-[36px]'}/>
                        </Link>
                    ))}
                </div>
            </div>
        </Page>
    )
}