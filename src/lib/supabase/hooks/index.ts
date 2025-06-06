// Экспорт всех хуков из директории hooks
export { useSupabaseUser } from './useSupabaseUser';
export { default as useLibraryStages } from './useLibraryStages';
export { default as useStageDetails } from './useStageDetails';
export { useCoursesAdmin } from './useCoursesAdmin';
export { useStagesAdmin } from './useStagesAdmin';
export { useLessonsAdmin } from './useLessonsAdmin';
export { useBlocksAdmin } from './useBlocksAdmin';
export { useAccessCheck } from './useAccessCheck';

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
export { useMaterialTariffAccess, useChatTariffAccess } from './useTariffAccess'; 