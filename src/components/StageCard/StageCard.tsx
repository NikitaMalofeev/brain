// Компонент карточки ступени
import React from 'react';

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
    onClick: (id: number) => void; // ИСПРАВЛЕНО: теперь number
}

const StageCard: React.FC<StageCardProps> = ({
    id,
    name,
    isLocked,
    onClick
}) => {
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
                // position: 'relative', // Убираем, так как замок теперь в потоке
            }}
        >
            <h3
                style={{
                    fontFamily: 'SF Pro Text, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '1.42', // Примерно 20px / 14px
                    color: '#000000',
                    margin: 0, // Убираем стандартные отступы
                    // Добавляем небольшой отступ снизу, если есть замок, чтобы было пространство
                    marginBottom: isLocked ? '8px' : '0',
                }}
            >
                {name}
            </h3>
            {isLocked && (
                <div
                    style={{
                        // Убираем абсолютное позиционирование
                        // position: 'absolute',
                        // top: '50%',
                        // left: '50%',
                        // transform: 'translate(-50%, -50%)',
                        width: '32px',  // Размеры иконки из Figma
                        height: '32px',
                        // Можно добавить marginTop, если нужно отодвинуть от текста
                        // marginTop: '8px', // Перенесли контроль отступа в h3.marginBottom
                    }}
                >
                    {/* Используем импортированную SVG иконку */}
                    {/* <LockIcon style={{ width: '100%', height: '100%', fill: '#515151' }} /> */}
                    {/* Временная заглушка, пока нет SVG */}
                    <span role="img" aria-label="lock" style={{ fontSize: '32px', color: '#515151' }}>🔒</span>
                </div>
            )}
        </div>
    );
};

export default StageCard; 