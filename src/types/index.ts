// ===== НОВЫЕ ТИПЫ ДЛЯ ТАБОВ АДМИНКИ =====

// Тип для чатов
export interface Chat {
    id: string;
    name: string;
    description?: string;
    link: string;
    order_num: number;
    created_at: string;
    stream_id?: string;  // ID привязанного потока
    stream_name?: string; // Название потока (приходит из JOIN)
    avatar_url?: string | null; // Путь к аватару чата
}

// Тип для FAQ
export interface FAQ {
    id: string;
    question: string;
    answer: string;
    order_num: number;
    created_at: string;
}

// Тип статуса эфира
export type BroadcastStatus = 'planned' | 'live' | 'completed';

// Тип для эфиров
export interface Broadcast {
    id: string;
    name: string;
    description?: string;
    broadcast_url?: string;
    start_time?: string;
    status: BroadcastStatus;
    recording_url?: string;
    created_at: string;
}

// Типы для форм создания/редактирования
export interface CreateChatData {
    name: string;
    description?: string;
    link: string;
    order_num: number;
    stream_id: string; // Обязательное поле при создании - ID потока
}

export interface UpdateChatData extends Partial<CreateChatData> {
    id: string;
}

export interface CreateFAQData {
    question: string;
    answer: string;
    order_num: number;
}

export interface UpdateFAQData extends Partial<CreateFAQData> {
    id: string;
}

export interface CreateBroadcastData {
    name: string;
    description?: string;
    broadcast_url?: string;
    start_time?: string;
    status: BroadcastStatus;
    recording_url?: string;
}

export interface UpdateBroadcastData extends Partial<CreateBroadcastData> {
    id: string;
} 