import React, { useState, useMemo } from 'react';
import { Page } from '@/components/Page';
import { useSupabaseUser, useUserStreamInfo, useUserStreamModules, usePreviewStreamModules, usePreviewStreamInfo } from '@/lib/supabase/hooks';
import { initDataState, useSignal } from '@telegram-apps/sdk-react';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import RoadMap from '@/components/RoadMap/RoadMap';
import { useNavigate } from 'react-router-dom';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

const RoadMapPage: React.FC = () => {
    const navigate = useNavigate();
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);
    const { isGuest } = useGuestStatus(supabaseUser?.id);
    const { data: streamInfo } = useUserStreamInfo(supabaseUser?.id);
    const { modulesAsStages: userModules, loading } = useUserStreamModules(supabaseUser?.id);
    const [showGuestModal, setShowGuestModal] = useState(false);

    // Preview данные для гостей без тарифа/потока
    const { data: previewModules, isLoading: previewLoading } = usePreviewStreamModules();
    const { data: previewStreamInfo } = usePreviewStreamInfo();

    // Определяем используем ли preview режим (нет модулей у пользователя)
    const isPreviewMode = !loading && (!userModules || userModules.length === 0);

    // Преобразуем preview модули в формат modulesAsStages
    const previewModulesAsStages = useMemo(() => {
        if (!previewModules) return [];
        return previewModules.map(m => ({
            stage_id: m.first_stage_id || 0,
            stage_name: m.module_name,
            is_unlocked: false, // Для roadmap все модули заблокированы визуально для гостей
            cover_image_path: null,
            unlock_day: m.unlock_day,
            module_id: m.module_id,
            total_lessons: m.total_lessons,
            completed_lessons: m.completed_lessons,
            unlocked_lessons: m.unlocked_lessons,
            overdue_lessons: m.overdue_lessons,
            total_assignments: m.total_assignments,
            completed_assignments: m.completed_assignments,
            overdue_assignments: m.overdue_assignments,
        }));
    }, [previewModules]);

    // Итоговые данные: используем пользовательские или preview
    const modulesAsStages = isPreviewMode ? previewModulesAsStages : userModules;
    const effectiveStreamInfo = isPreviewMode && previewStreamInfo ? {
        startDate: previewStreamInfo.start_date,
        currentWeek: previewStreamInfo.current_week,
        streamName: previewStreamInfo.stream_name,
        totalWeeks: 9 // Дефолтное значение для preview
    } : streamInfo;

    // Загрузка: ждём пользователя и данные модулей (включая preview)
    const isFullyLoading = !supabaseUser?.id || loading || (isPreviewMode && previewLoading);

    if (isFullyLoading) {
        return (
            <Page back={true} showTabBar={false}>
                <LoadingSpinner />
            </Page>
        );
    }

    const handleStageClick = (stageId: number, moduleId?: string) => {
        if (moduleId) {
            navigate(`/library/module/${moduleId}`);
        } else {
            navigate(`/library/stage/${stageId}`);
        }
    };

    return (
        <Page back={true} showTabBar={false}>
            <div className="with-content-offset" style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
                <RoadMap
                    stages={modulesAsStages || []}
                    onStageClick={handleStageClick}
                    isGuest={isGuest || isPreviewMode}
                    onGuestBlock={() => setShowGuestModal(true)}
                    userPhotoUrl={supabaseUser?.photo_url || undefined}
                    currentWeek={effectiveStreamInfo?.currentWeek || 1}
                    totalWeeks={effectiveStreamInfo?.totalWeeks || 9}
                    streamStartDate={effectiveStreamInfo?.startDate}
                />
            </div>

            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                ctaUrl="https://brainprogramming.ru/main?utm_source=app"
            />
        </Page>
    );
};

export default RoadMapPage;
