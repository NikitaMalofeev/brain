import React from 'react';
import { Lock } from 'lucide-react';
import { SearchResult } from '@/lib/supabase/hooks/useGlobalSearch';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';

interface SearchResultCardProps {
    result: SearchResult;
    onDisabledClick?: () => void;
}

// Удаляем текст в квадратных скобках из названия
const cleanName = (name: string) => name.replace(/\s*\[.*?\]/g, '').trim();

// Форматирование даты
const formatUnlockDate = (isoDate: string | null): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
};

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ result }) => {
    const isDisabled = !result.is_unlocked;
    const coverUrl = buildFileUrl(result.stage_cover_image_path) || '/test.png';
    const stageName = cleanName(result.stage_name);
    const matchedInDisplay = result.matched_in.slice(0, 2).map(cleanName).join(', ');
    const hasMore = result.matched_in.length > 2;
    const unlockDateFormatted = formatUnlockDate(result.unlock_date);

    return (
        <div className={`flex bg-white rounded-2xl overflow-hidden shadow-sm ${isDisabled ? 'opacity-60' : ''}`}>
            {/* Миниатюра */}
            <div className="relative w-24 h-24 flex-shrink-0">
                <img
                    src={coverUrl}
                    alt={stageName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/test.png'; }}
                />
                {isDisabled && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Контент */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div>
                    <p className="font-semibold text-sm text-gray-900 truncate">
                        {stageName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {matchedInDisplay}{hasMore && ` +${result.matched_in.length - 2}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 truncate max-w-[150px]">
                        {cleanName(result.module_name)}
                    </span>
                    {isDisabled && unlockDateFormatted && (
                        <span className="text-xs text-orange-600 font-medium ml-auto flex-shrink-0">
                            {unlockDateFormatted}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchResultCard;
