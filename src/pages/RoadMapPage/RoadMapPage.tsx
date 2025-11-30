import React from 'react';
import { Page } from '@/components/Page';
import { useSupabaseUser, useUserStreamInfo, useUserStreamModules } from '@/lib/supabase/hooks';
import { initDataState, useSignal } from '@telegram-apps/sdk-react';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import RoadMap from '@/components/RoadMap/RoadMap';
import { useNavigate } from 'react-router-dom';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import { useState } from 'react';

const RoadMapPage: React.FC = () => {
    const navigate = useNavigate();
    const initDataSignal = useSignal(initDataState);
    const { supabaseUser } = useSupabaseUser(initDataSignal);
    const { isGuest } = useGuestStatus(supabaseUser?.id);
    const { data: streamInfo } = useUserStreamInfo(supabaseUser?.id);
    const { modulesAsStages, loading } = useUserStreamModules(supabaseUser?.id);
    const [showGuestModal, setShowGuestModal] = useState(false);

    if (!supabaseUser?.id || loading) {
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
            <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
                <RoadMap
                    stages={modulesAsStages || []}
                    onStageClick={handleStageClick}
                    isGuest={isGuest}
                    onGuestBlock={() => setShowGuestModal(true)}
                    userPhotoUrl={supabaseUser?.photo_url || undefined}
                    currentWeek={streamInfo?.currentWeek || 1}
                    totalWeeks={streamInfo?.totalWeeks || 9}
                    streamStartDate={streamInfo?.startDate}
                />
            </div>

            <GuestBlockedModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                ctaUrl="https://brainprogramming.ru/enroll"
            />
        </Page>
    );
};

export default RoadMapPage;
