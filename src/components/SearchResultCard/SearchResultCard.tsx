import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { Lock } from 'lucide-react';
import { SearchResult } from '@/lib/supabase/hooks/useGlobalSearch';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';

interface SearchResultCardProps {
    result: SearchResult;
    onDisabledClick?: () => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, onDisabledClick }) => {
    const isDisabled = !result.is_unlocked;
    const coverUrl = buildFileUrl(result.stage_cover_image_path) || '/test.png';

    // Показываем первые 2 места совпадения
    const matchedInDisplay = result.matched_in.slice(0, 2).join(', ');
    const hasMore = result.matched_in.length > 2;

    const handleClick = (e: React.MouseEvent) => {
        if (isDisabled) {
            e.preventDefault();
            onDisabledClick?.();
        }
    };

    const cardContent = (
        <motion.div
            whileTap={isDisabled ? undefined : { scale: 0.98 }}
            style={{ touchAction: 'manipulation' }}
            className="w-full"
        >
            <div
                className={`flex bg-white rounded-2xl overflow-hidden shadow-sm ${isDisabled ? 'opacity-60' : ''}`}
            >
                {/* Миниатюра */}
                <div className="relative w-24 h-24 flex-shrink-0">
                    <img
                        src={coverUrl}
                        alt={result.stage_name}
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
                        {/* Название ступени */}
                        <p className="font-semibold text-sm text-gray-900 truncate">
                            {result.stage_name}
                        </p>

                        {/* Где найдено совпадение */}
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {matchedInDisplay}{hasMore && ` +${result.matched_in.length - 2}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        {/* Модуль */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 truncate max-w-[150px]">
                            {result.module_name}
                        </span>

                        {/* День открытия если заблокировано */}
                        {isDisabled && (
                            <span className="text-xs text-orange-600 font-medium ml-auto flex-shrink-0">
                                День {result.module_unlock_day}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    if (isDisabled) {
        return (
            <div onClick={handleClick} className="cursor-not-allowed">
                {cardContent}
            </div>
        );
    }

    return (
        <Ripple className="rounded-2xl overflow-hidden w-full">
            <Link to={`/library/lesson/${result.lesson_id}`} className="block">
                {cardContent}
            </Link>
        </Ripple>
    );
};

export default SearchResultCard;
