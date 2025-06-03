// Компонент карточки ступени
import React from 'react';
import { buildImageUrl } from '@/lib/cloudflareR2Service';

// Импортируем SVG как компонент React
// Убедитесь, что у вас есть файл lock.svg в указанном пути
// и настроен загрузчик SVG (например, svgr для Vite/Create React App)
// import LockIcon from './lock.svg?react'; // Убираем импорт SVG

export interface StageCardProps {
    id: number; // ИСПРАВЛЕНО: теперь number (BIGINT из PostgreSQL)
    name: string;
    // progressText: string; // Убираем, нет в дизайне карточки
    isLocked: boolean;
    // lockReason?: string; // Убираем, нет в дизайне карточки
    coverImagePath?: string; // Путь к обложке ступени
    onClick: (id: number) => void; // ИСПРАВЛЕНО: теперь number
}

const StageCard: React.FC<StageCardProps> = ({
    id,
    name,
    isLocked,
    coverImagePath,
    onClick
}) => {
    // Диагностика обложки в консоли (как в LessonCard)
    React.useEffect(() => {
        if (coverImagePath) {
            console.log(`🖼️ StageCard #${id} (${name}): обложка найдена -`, coverImagePath);
            try {
                const fullUrl = buildImageUrl(coverImagePath);
                console.log(`🔗 StageCard #${id}: полный URL обложки -`, fullUrl);
            } catch (error) {
                console.warn(`⚠️ StageCard #${id}: ошибка построения URL -`, error);
            }
        } else {
            console.log(`📭 StageCard #${id} (${name}): обложка отсутствует, используется дефолтная`);
        }
    }, [id, name, coverImagePath]);

    // Определяем URL обложки с фолбэком
    const getCoverImageUrl = () => {
        if (!coverImagePath) {
            return '/assets/default-lesson-cover.svg'; // Дефолтная обложка для ступеней
        }

        try {
            return buildImageUrl(coverImagePath);
        } catch (error) {
            console.warn(`⚠️ StageCard #${id}: ошибка при построении URL обложки, используется дефолтная`, error);
            return '/assets/default-lesson-cover.svg';
        }
    };

    return (
        <div
            onClick={() => !isLocked && onClick(id)}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px', // Внутренний отступ для контента, если он будет
                cursor: isLocked ? 'default' : 'pointer',
                // opacity: isLocked ? 0.7 : 1, // Можно настроить прозрачность для заблокированных
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)', // Легкая тень как в дизайне
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Центрируем контент по горизонтали
                justifyContent: 'center', // Центрируем контент по вертикали
                textAlign: 'center', // Текст по центру
                width: '100%', // Занимаем всю ширину родителя
                height: '171px', // Высота как в Figma
                boxSizing: 'border-box', // Чтобы padding и border не влияли на общую ширину/высоту
                overflow: 'hidden', // Чтобы обложка не выходила за границы
                position: 'relative',
            }}
        >
            {/* Обложка ступени */}
            <div
                style={{
                    width: '100%',
                    height: '100px', // Примерно 60% высоты карточки
                    backgroundImage: `url(${getCoverImageUrl()})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    borderRadius: '16px 16px 0 0',
                    position: 'relative',
                }}
            >
                {/* Затемнение для заблокированных ступеней */}
                {isLocked && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '16px 16px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <span role="img" aria-label="lock" style={{ fontSize: '32px', color: '#FFFFFF' }}>🔒</span>
                    </div>
                )}
            </div>

            {/* Текстовый контент внизу */}
            <div
                style={{
                    padding: '12px 16px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                <h3
                    style={{
                        fontFamily: 'SF Pro Text, sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '1.42',
                        color: isLocked ? '#999' : '#000000',
                        margin: 0,
                    }}
                >
                    {name}
                </h3>
            </div>
        </div>
    );
};

export default StageCard; 