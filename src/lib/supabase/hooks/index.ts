// Экспорт всех хуков из директории hooks
export * from './useAccessCheck';
export * from './useActiveTariff';
export * from './useActiveCourse';
export * from './useBlocksAdmin';
export * from './useCoursesAdmin';
export * from './useCuratorActions';
export * from './useCuratorDetails';
export * from './useCuratorsAdmin';
export * from './useLessonsAdmin';
export * from './useLibraryStages';
export * from './useRedeemToken';
export * from './useFindTokenByTgId';
export * from './useStageDetails';
export * from './useStagesAdmin';
export * from './useStudentActions';
export * from './useStudentDetails';
export * from './useStudentsAdmin';
export * from './useSupabaseUser';

// Хуки для проверки тарифов и доступа
export { useActiveTariff, useHasActiveTariff } from './useActiveTariff';
export { useIsGuest, useGuestStatus } from './useIsGuest';

// Новые хуки для управления учениками и кураторами
export { useStudentsAdmin } from './useStudentsAdmin';
export { useStudentDetails } from './useStudentDetails';
export { useStudentActions } from './useStudentActions';
export { useCuratorsAdmin } from './useCuratorsAdmin';
export { useCuratorDetails } from './useCuratorDetails';
export { useCuratorActions } from './useCuratorActions';

// Хуки для новых табов админки
export { useChatsAdmin } from './useChatsAdmin';
export { useFaqAdmin } from './useFaqAdmin';
export { useBroadcastsAdmin } from './useBroadcastsAdmin';
export { useTariffsAdmin } from './useTariffsAdmin';
export { useTariffLimits } from './useTariffLimits';
export { useChatAccess } from './useChatAccess';
export { useMaterialTariffAccess, saveChatTariffAccess, saveMaterialTariffAccess } from './useTariffAccess';

// Хуки для техник (аудиопрактик)
export { useTechniques, useTechniquesFiltered } from './useTechniques';

// Хук для информации о потоке и неделе обучения
export { useUserStreamInfo } from './useUserStreamInfo';

// Хук для модулей потока пользователя
export { useUserStreamModules } from './useUserStreamModules';