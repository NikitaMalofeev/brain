import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { logger } from '../../logger';

// Интерфейс для урока в модуле
export interface ModuleLesson {
  lesson_id: string;
  lesson_title: string;
  lesson_description: string | null;
  lesson_type: string;
  order_num: number;
  points: number;
  has_assignment: boolean;
  open_at: string | null;
  is_unlocked: boolean;
  is_completed: boolean;
  completed_at: string | null;
  submission_status: string | null;
}

// Интерфейс для деталей модуля
export interface ModuleDetails {
  module_id: string;
  module_name: string;
  module_description: string;
  module_color: string | null;
  module_order_num: number;
  stream_id: string;
  stream_name: string;
  duration_days: number;
  lessons: ModuleLesson[];
}

interface UseModuleDetailsResult {
  moduleDetails: ModuleDetails | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Хук для получения деталей модуля потока с уроками
 */
export function useModuleDetails(
  userId: string | null | undefined,
  moduleId: string | null | undefined
): UseModuleDetailsResult {
  const query = useQuery({
    queryKey: ['module-details', userId, moduleId],
    queryFn: async (): Promise<ModuleDetails | null> => {
      if (!userId || !moduleId || !supabase) {
        logger.debug('Missing required parameters for module details', { userId, moduleId });
        return null;
      }

      logger.debug('Fetching module details', { userId, moduleId });

      const { data, error } = await supabase.rpc('get_stream_module_details', {
        p_user_id: userId,
        p_module_id: moduleId,
      });

      if (error) {
        logger.error('Error fetching module details', { userId, moduleId, error });
        throw error;
      }

      if (!data || data.length === 0) {
        logger.debug('Module not found', { moduleId });
        return null;
      }

      const result = data[0];

      logger.debug('Module details fetched successfully', {
        moduleId,
        moduleName: result.module_name,
        lessonsCount: result.lessons?.length || 0,
      });

      return {
        module_id: result.module_id,
        module_name: result.module_name,
        module_description: result.module_description,
        module_color: result.module_color,
        module_order_num: result.module_order_num,
        stream_id: result.stream_id,
        stream_name: result.stream_name,
        duration_days: result.duration_days,
        lessons: result.lessons || [],
      };
    },
    enabled: !!userId && !!moduleId,
    retry: 2,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    moduleDetails: query.data || null,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
