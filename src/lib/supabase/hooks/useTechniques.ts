import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';
import { TechniqueWithAccess } from '../types';

/**
 * Хук для получения списка техник с информацией о доступе пользователя
 * Вызывает RPC функцию get_techniques_with_access
 *
 * @param userId - ID пользователя (null для гостей)
 * @returns Query с массивом техник и информацией о доступе
 */
export function useTechniques(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['techniques', userId],
    queryFn: async (): Promise<TechniqueWithAccess[]> => {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return [];
      }

      logger.debug('Fetching techniques with access and schedule', { userId });

      // Сначала пробуем новую функцию с расписанием модулей
      const { data: scheduleData, error: scheduleError } = await supabase.rpc(
        'get_user_techniques_with_schedule',
        { p_user_id: userId || null }
      );

      // Если новая функция работает - используем её
      if (!scheduleError && scheduleData) {
        logger.debug('Techniques with schedule fetched successfully', {
          userId,
          count: scheduleData?.length || 0
        });
        return (scheduleData as TechniqueWithAccess[]) || [];
      }

      // Fallback на старую функцию если новая не работает
      logger.warn('New function not found, falling back to get_techniques_with_access', {
        userId,
        error: scheduleError
      });

      const { data, error } = await supabase.rpc('get_techniques_with_access', {
        p_user_id: userId || null,
      });

      if (error) {
        logger.error('Error fetching techniques', { userId, error });
        throw error;
      }

      logger.debug('Techniques fetched successfully (fallback)', {
        userId,
        count: data?.length || 0
      });

      return (data as TechniqueWithAccess[]) || [];
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });

  return query;
}

// Интерфейс для группы техник по пакету
export interface BundleGroup {
  bundleId: string;
  bundleName: string;
  techniques: TechniqueWithAccess[];
}

/**
 * Хук-хелпер для фильтрации техник по категориям
 * Разделяет техники на доступные, заблокированные и те, к которым есть доступ
 *
 * Статусы:
 * - 'free' = бесплатная (показывается в библиотеке, доступна всем)
 * - 'paid' = платная (показывается в библиотеке, требует оплаты)
 * - 'locked' = заблокирована по условию (after_technique, after_duration)
 *
 * Категории:
 * - myTechniques: техники с has_access = true (из пакетов, модулей, прямого доступа)
 * - availableTechniques: can_purchase = true И is_unlocked = true (платные к покупке)
 * - lockedTechniques: нет доступа, не разблокирована
 * - freeTechniques: status = 'free'
 * - paidTechniques: status = 'paid' (платные, требуют оплаты)
 * - bundleGroups: техники сгруппированные по пакетам
 *
 * @param userId - ID пользователя
 * @returns Объект с отфильтрованными массивами техник
 */
export function useTechniquesFiltered(userId: string | null | undefined) {
  const { data: techniques, isLoading, error } = useTechniques(userId);

  // Хелпер для определения платного статуса
  const isPaidStatus = (status: string | undefined | null) =>
    status === 'paid';

  // ========================================
  // ВАЖНО: Каждая техника должна попасть только в ОДНУ категорию!
  // Используем Set для отслеживания уже распределённых техник
  //
  // ПРИОРИТЕТ ИСТОЧНИКА ДОСТУПА:
  // 1. Если техника в модуле → проверяем ТОЛЬКО дату (is_unlocked), status игнорируется
  // 2. Если техника в пакете (bundle) → доступна
  // 3. Если прямой доступ → доступна
  // 4. Только потом смотрим status (free/paid)
  // ========================================
  const usedIds = new Set<string>();

  // 1. Техники из пакетов (bundle) - высший приоритет для группировки
  const bundleTechniquesWithAccess = techniques?.filter(
    (t) => t.has_access && t.user_access_source === 'bundle' && t.bundle_id
  ) || [];

  // Добавляем в usedIds
  bundleTechniquesWithAccess.forEach((t) => usedIds.add(t.id));

  // Группируем техники из пакетов по bundle_id
  const bundleGroupsMap = new Map<string, BundleGroup>();
  bundleTechniquesWithAccess.forEach((t) => {
    if (t.bundle_id && t.bundle_name) {
      if (!bundleGroupsMap.has(t.bundle_id)) {
        bundleGroupsMap.set(t.bundle_id, {
          bundleId: t.bundle_id,
          bundleName: t.bundle_name,
          techniques: [],
        });
      }
      bundleGroupsMap.get(t.bundle_id)!.techniques.push(t);
    }
  });
  const bundleGroups = Array.from(bundleGroupsMap.values());

  // 2. Техники из модулей - ПРИОРИТЕТ МОДУЛЯ! (status игнорируется)
  // 2a. Разблокированные по дате из модулей → идут в myTechniques
  const moduleTechniquesUnlocked = techniques?.filter(
    (t) => !usedIds.has(t.id) && t.user_access_source === 'module' && t.is_unlocked === true
  ) || [];

  // Добавляем в usedIds
  moduleTechniquesUnlocked.forEach((t) => usedIds.add(t.id));

  // 2b. Заблокированные по времени из модулей (дата ещё не прошла)
  const moduleTechniques = techniques?.filter(
    (t) => !usedIds.has(t.id) && t.user_access_source === 'module' && t.is_unlocked === false
  ) || [];

  // Добавляем в usedIds
  moduleTechniques.forEach((t) => usedIds.add(t.id));

  // 3. Мои техники - прямой доступ (НЕ bundle, НЕ module, НЕ free, НЕ уже использованные)
  // Бесплатные (free) идут в отдельную секцию "Бесплатные", не в "Мои"
  const myTechniquesFromDirect = techniques?.filter(
    (t) => !usedIds.has(t.id) && t.has_access && t.user_access_source !== 'bundle' && t.user_access_source !== 'module' && t.status !== 'free'
  ) || [];

  // Добавляем в usedIds
  myTechniquesFromDirect.forEach((t) => usedIds.add(t.id));

  // Объединяем прямой доступ + разблокированные модульные
  const myTechniques = [...myTechniquesFromDirect, ...moduleTechniquesUnlocked];

  // 4. Бесплатные техники (status='free') - отдельная секция "Бесплатные"
  // НЕ попадают в "Мои", показываются в отдельном блоке для всех пользователей
  const freeTechniques = techniques?.filter(
    (t) => !usedIds.has(t.id) && t.status === 'free'
  ) || [];

  // Добавляем в usedIds
  freeTechniques.forEach((t) => usedIds.add(t.id));

  // 5. К покупке - платные техники (status='paid' ИЛИ can_purchase=true), нет доступа
  // Объединяем paidTechniques и availableTechniques в один список
  const availableTechniques = techniques?.filter(
    (t) => !usedIds.has(t.id) && !t.has_access && (isPaidStatus(t.status) || t.can_purchase) && t.is_unlocked !== false
  ) || [];

  // Добавляем в usedIds
  availableTechniques.forEach((t) => usedIds.add(t.id));

  // paidTechniques - алиас для обратной совместимости
  const paidTechniques = availableTechniques;

  // 7. Остальные заблокированные (НЕ из модулей - они уже обработаны)
  const lockedTechniques = techniques?.filter(
    (t) => !usedIds.has(t.id) && !t.has_access && t.is_unlocked === false
  ) || [];

  // myFreeTechniques - для обратной совместимости (бесплатные в "Мои техники")
  // Теперь это просто ссылка на freeTechniques
  const myFreeTechniques = freeTechniques;

  return {
    techniques: techniques || [],
    availableTechniques,
    lockedTechniques,
    myTechniques,
    freeTechniques,
    myFreeTechniques,
    paidTechniques,
    moduleTechniques,
    bundleGroups,
    isLoading,
    error,
  };
}
