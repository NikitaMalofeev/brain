import {Page} from "@/components";
import {Link} from "react-router-dom";

export const Chats = ()=>{
    const chats = [
        {
            title: "Chat 1",
            description: "Очень краткое описание чата, его целей, правил, активности",
            link: 'https://t.me/123'
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
    return(
        <Page>

            <div className={'flex flex-col gap-4 p-4 bg-gray-100 text-black/80 min-h-screen'}>
                <h2 className={'font-bold text-3xl'}>Важные чаты</h2>
                {chats.map(el => (
                    <Link className={'p-4 rounded-2xl bg-white flex items-center justify-between'} to={el.link}>
                        <div className={'flex items-center gap-4'}>
                            <div className={'min-w-10 h-10 bg-gray-200 rounded-full'}>

                            </div>
                            <div className={'flex flex-col gap-1'}>
                                <p className={'text-lg font-bold'}>{el.title}</p>
                                <p>{el.description}</p>
                            </div>
                        </div>
                        <svg className={'min-w-8'} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5L16 12L9 19" stroke="black" stroke-width="1.5" stroke-linecap="round"
                                  stroke-linejoin="round"/>
                        </svg>
                    </Link>
                ))}
            </div>
        </Page>
    )
}