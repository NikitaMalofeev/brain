import React from 'react';
import { Page } from '@/components';
import { useSupabaseUser, useUserStreamInfo, useUserStreamModules } from '@/lib/supabase/hooks';
import { initDataState, useSignal } from '@telegram-apps/sdk-react';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import RoadMap from '@/components/RoadMap/RoadMap';
import { useNavigate } from 'react-router-dom';
import GuestBlockedModal from '@/components/GuestBlockedModal';
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
                <div className="profile-loading">
                    <img
                        src="/coin3.png"
                        alt="Loading"
                        style={{
                            width: 128,
                            height: 128,
                            animation: 'coin3dSpin 1s linear infinite',
                        }}
                    />
                    <style>{`
                        @keyframes coin3dSpin {
                            0% { transform: rotateY(0deg); }
                            100% { transform: rotateY(360deg); }
                        }
                        @keyframes dotAnimation {
                            0%, 20% { opacity: 0; }
                            40% { opacity: 1; }
                            100% { opacity: 1; }
                        }
                        .loading-dots span {
                            opacity: 0;
                            animation: dotAnimation 1.5s infinite;
                        }
                        .loading-dots span:nth-child(1) { animation-delay: 0s; }
                        .loading-dots span:nth-child(2) { animation-delay: 0.3s; }
                        .loading-dots span:nth-child(3) { animation-delay: 0.6s; }
                    `}</style>
                    <p>Загрузка карты<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>
                </div>
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
