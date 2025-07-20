import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { useActiveCourse } from './useActiveCourse';

interface Material {
    id: string;
    name: string;
    description?: string | null;
    cover_image_path?: string | null;
    material_type: 'video' | 'audio';
    order_num: number;
    course_id?: string | null;
    release_date?: string | null;
    created_at: string;
    updated_at: string;
}

export function useAvailableMaterials(userId?: string | null) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    // Получаем активный курс пользователя
    const { activeCourse } = useActiveCourse(userId);

    const loadMaterials = async () => {
        if (!activeCourse?.course_id) {
            setMaterials([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const now = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('course_id', activeCourse.course_id)
                .lte('release_date', now) // Только материалы с датой открытия <= текущей
                .order('release_date', { ascending: true })
                .order('order_num', { ascending: true });

            if (error) throw error;
            setMaterials(data || []);
        } catch (err) {
            setError(err as Error);
            console.error('Error loading available materials:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMaterials();
    }, [activeCourse?.course_id]);

    return {
        materials,
        loading,
        error,
        refresh: loadMaterials
    };
}

// Функция для проверки доступности конкретного материала
export async function checkMaterialAvailability(materialId: string, userId?: string | null): Promise<boolean> {
    if (!materialId || !userId || !supabase) return false;

    try {
        // Получаем активный курс пользователя
        const { data: activeCourse } = await supabase
            .from('user_courses')
            .select('course_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (!activeCourse) return false;

        // Проверяем материал
        const now = new Date().toISOString();
        const { data: material, error } = await supabase
            .from('materials')
            .select('id')
            .eq('id', materialId)
            .eq('course_id', activeCourse.course_id)
            .lte('release_date', now)
            .single();

        return !error && !!material;
    } catch (err) {
        console.error('Error checking material availability:', err);
        return false;
    }
}