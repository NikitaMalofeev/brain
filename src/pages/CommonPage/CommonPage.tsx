import {Page} from "@/components";
import {useState} from "react";

const tabs = [
    'Все',
    'Аудио',
    'Видео'
]
const lessons = [
    {
        id: 1,
        type: 'video',
        title: 'Упражнение на борьбу со страхом',
    },
    {
        id: 2,
        type: 'audio',
        title: 'Вечерняя прокачка',
        subtitle: 'Принятие, ценность и любовь'
    },
    {
        id: 3,
        type: 'video',
        title: 'Вечерняя прокачка'
    }
]
export const CommonPage = () => {
    const [currentTab, setCurrentTab] = useState<number>(0);
    return (
        <Page>
            <div className={'flex flex-col min-h-screen text-black '}>
                <div className={'p-4 flex flex-col gap-2'}>
                    <h2 className={'font-bold text-xl'}>Библиотека</h2>
                    <div className={'flex items-center gap-1'}>
                        {
                            tabs.map((tab, index) => (
                                <div onClick={() => {
                                    setCurrentTab(index)
                                }} key={index}
                                     className={`transition duration-200 ease-in cursor-pointer text-sm font-semibold rounded-full bg-[linear-gradient(180deg,_#E9E9E9_0%,_#E8E8E8_100%)] py-2 px-4 ${currentTab === index && '!bg-[linear-gradient(109.65deg,_#71B4EA_13.64%,_#3996E2_124.92%)] text-white'}`}>
                                    {tab}
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div className={'bg-[url("/bg3.jpg")] bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3'}>
                    {lessons.filter(el => currentTab === 0 ? true : currentTab === 1 ? el.type === "video" : el.type === "audio").map((lesson, index) => (
                        lesson.type === 'video' ?
                            <div key={index} className={'bg-white rounded-3xl p-6 flex flex-col gap-4'}>
                                {(<div className={'h-[200px] bg-gray-200 rounded-xl'}></div>)}
                                <p>{lesson.title}</p>
                            </div> :
                            <div className={'bg-white rounded-3xl py-3 px-6 flex items-center gap-4'} key={index}>
                                <div className={'w-8 h-8 rounded-full bg-gray-200'}>
                                </div>
                                <div className={'flex flex-col gap-1'}>
                                    <p className={'font-bold text-lg'}>{lesson.title}</p>
                                    {lesson.subtitle &&
                                        <p className={'text-sm text-black/70'}>{lesson.subtitle}</p>}
                                </div>
                            </div>
                    ))}
                </div>
            </div>


        </Page>
    )
}