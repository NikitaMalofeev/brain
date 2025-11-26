import React, { useState, useMemo } from 'react';
import { useStreams } from '@/lib/supabase/hooks/useTariffConfiguration';
import { useStreamModules } from '@/lib/supabase/hooks/useStreamModules';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  ColorPicker,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  DragOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ========== INTERFACES ==========
interface StreamModule {
  id: string;
  stream_id: string;
  name: string;
  color: string | null;
  order_num: number;
}

interface Material {
  id: string;
  name: string;
  description: string | null;
  material_type: 'video' | 'audio';
}

interface ModuleMaterial {
  id: string;
  module_id: string;
  material_id: string;
  order_num: number;
  release_day: number | null;
  active_days: number | null;
  material?: Material;
}

// ========== HOOKS ==========
function useAllMaterials() {
  return useQuery({
    queryKey: ['all-materials'],
    queryFn: async (): Promise<Material[]> => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, description, material_type')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useModuleMaterials(moduleId: string | null) {
  return useQuery({
    queryKey: ['module-materials', moduleId],
    queryFn: async (): Promise<ModuleMaterial[]> => {
      if (!supabase || !moduleId) return [];
      const { data, error } = await supabase
        .from('module_materials')
        .select(`
          id, module_id, material_id, order_num, release_day, active_days,
          material:materials(id, name, description, material_type)
        `)
        .eq('module_id', moduleId)
        .order('release_day', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        material: item.material as unknown as Material
      }));
    },
    enabled: !!moduleId,
  });
}

function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { stream_id: string; name: string; color: string | null; order_num: number }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('stream_modules')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name: string; color: string | null; order_num: number }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('stream_modules')
        .update({ name: params.name, color: params.color, order_num: params.order_num })
        .eq('id', params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.from('stream_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-modules'] });
    },
  });
}

function useAddModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { module_id: string; material_id: string; order_num: number; release_day: number; active_days?: number | null }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('module_materials')
        .insert({
          module_id: params.module_id,
          material_id: params.material_id,
          order_num: params.order_num,
          release_day: params.release_day,
          active_days: params.active_days || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

function useRemoveModuleMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; module_id: string }) => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.from('module_materials').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-materials', variables.module_id] });
    },
  });
}

// ========== COMPONENT ==========
