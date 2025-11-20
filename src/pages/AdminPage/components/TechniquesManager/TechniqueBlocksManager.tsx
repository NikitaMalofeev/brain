import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Plus, Edit2, Trash2, ArrowLeft, FileText, Video, Music, Image, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUploader, FileUploaderRef } from '@/components/FileUploader/FileUploader';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { FILE_PREFIXES } from '@/lib/supabase/storage_prefixes';
import { generateWaveformData } from '@/lib/audio/waveformGenerator';

interface TechniqueBlock {
  id: number;
  technique_id: string;
  order_num: number;
  title: string | null;
  block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
  content_text: string | null;
  content_url: string | null;
  meta_json: any;
  created_at: string;
}

interface BlockFormData {
  title: string;
  block_type: 'text' | 'video' | 'audio' | 'image' | 'pdf';
  content_text: string;
  content_url: string;
  order_num: number;
}

interface Props {
  techniqueId: string;
  techniqueTitle: string;
  onBack: () => void;
}

const TechniqueBlocksManager: React.FC<Props> = ({ techniqueId, techniqueTitle, onBack }) => {
  const queryClient = useQueryClient();
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TechniqueBlock | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<BlockFormData>({
    title: '',
    block_type: 'text',
    content_text: '',
    content_url: '',
    order_num: 1,
  });

  // Получить блоки техники
  const { data: blocks, isLoading } = useQuery({
    queryKey: ['technique-blocks', techniqueId],
    queryFn: async (): Promise<TechniqueBlock[]> => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('technique_blocks')
        .select('*')
        .eq('technique_id', techniqueId)
        .order('order_num', { ascending: true });

      if (error) {
        logger.error('Error fetching technique blocks', { error });
        throw error;
      }

      return data || [];
    },
  });

  // Создать/обновить блок
  const saveBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      if (!supabase) throw new Error('Supabase not initialized');

      if (editingBlock) {
        const { error } = await supabase
          .from('technique_blocks')
          .update(blockData)
          .eq('id', editingBlock.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('technique_blocks')
          .insert({ ...blockData, technique_id: techniqueId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technique-blocks', techniqueId] });
      closeModal();
    },
  });

  // Удалить блок
  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('technique_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technique-blocks', techniqueId] });
    },
  });

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormData({
      title: '',
      block_type: 'text',
      content_text: '',
      content_url: '',
      order_num: (blocks?.length || 0) + 1,
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (block: TechniqueBlock) => {
    setEditingBlock(block);
    setFormData({
      title: block.title || '',
      block_type: block.block_type,
      content_text: block.content_text || '',
      content_url: block.content_url || '',
      order_num: block.order_num,
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
    setSelectedFile(null);
    setSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalContentUrl = formData.content_url.trim() || null;

      // Загружаем файл если выбран
      if (selectedFile && fileUploaderRef.current) {
        const uploadResult = await fileUploaderRef.current.uploadFile();
        if (uploadResult?.filePath) {
          finalContentUrl = uploadResult.filePath;
        }
      }

      let blockData: any = {
        title: formData.title.trim() || null,
        block_type: formData.block_type,
        content_text: formData.content_text.trim() || null,
        content_url: finalContentUrl,
        order_num: formData.order_num,
      };

      // Генерируем waveform для аудио
      if (formData.block_type === 'audio' && finalContentUrl) {
        try {
          const audioUrl = buildFileUrl(finalContentUrl);
          if (audioUrl) {
            const waveformData = await generateWaveformData(audioUrl);
            blockData.meta_json = { audio_data: waveformData };
          }
        } catch (err) {
          console.warn('Could not generate waveform:', err);
        }
      }

      await saveBlockMutation.mutateAsync(blockData);
    } catch (error) {
      alert('Ошибка при сохранении: ' + (error as any)?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (block: TechniqueBlock) => {
    if (!confirm(`Удалить блок "${block.title || 'Без названия'}"?`)) return;

    try {
      await deleteBlockMutation.mutateAsync(block.id);
    } catch (error) {
      alert('Ошибка при удалении: ' + (error as any)?.message);
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'pdf': return <FileType className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Текст',
      video: 'Видео',
      audio: 'Аудио',
      image: 'Изображение',
      pdf: 'PDF',
    };
    return labels[type] || type;
  };

  const getAcceptedTypes = (blockType: string) => {
    switch (blockType) {
      case 'audio': return 'audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/m4a';
      case 'image': return 'image/jpeg,image/png,image/webp,image/gif';
      case 'pdf': return 'application/pdf';
      default: return '*/*';
    }
  };

  const getFilePrefix = (blockType: string) => {
    switch (blockType) {
      case 'audio': return FILE_PREFIXES.AUDIO;
      case 'image': return FILE_PREFIXES.IMAGE;
      case 'pdf': return FILE_PREFIXES.DOCUMENT;
      default: return FILE_PREFIXES.DOCUMENT;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
          <p className="text-sm text-gray-600">Загрузка блоков...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Блоки техники</h2>
            <p className="text-sm text-gray-600">{techniqueTitle}</p>
          </div>
        </div>
        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          Добавить блок
        </Button>
      </div>

      {/* Список блоков */}
      {blocks && blocks.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Заголовок</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Контент</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blocks.map((block) => (
                <tr key={block.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{block.order_num}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getBlockIcon(block.block_type)}
                      <span className="text-sm">{getBlockTypeLabel(block.block_type)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {block.title || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {block.block_type === 'text' ? (
                      <span className="truncate block max-w-xs">
                        {block.content_text?.substring(0, 50)}
                        {(block.content_text?.length || 0) > 50 ? '...' : ''}
                      </span>
                    ) : block.content_url ? (
                      <span className="truncate block max-w-xs text-blue-600">
                        {block.content_url.substring(0, 40)}...
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(block)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(block)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-4">Нет блоков контента</p>
          <Button
            onClick={openCreateModal}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Добавить первый блок
          </Button>
        </div>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBlock ? 'Редактировать блок' : 'Добавить блок'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип блока
                  </label>
                  <select
                    value={formData.block_type}
                    onChange={(e) => setFormData({ ...formData, block_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="text">Текст</option>
                    <option value="video">Видео (URL)</option>
                    <option value="audio">Аудио</option>
                    <option value="image">Изображение</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Порядок
                  </label>
                  <input
                    type="number"
                    value={formData.order_num}
                    onChange={(e) => setFormData({ ...formData, order_num: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Необязательно"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {formData.block_type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текст
                  </label>
                  <textarea
                    value={formData.content_text}
                    onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-y"
                  />
                </div>
              ) : formData.block_type === 'video' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL видео (Kinescope)
                  </label>
                  <input
                    type="text"
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Файл
                  </label>
                  <FileUploader
                    ref={fileUploaderRef}
                    onFileSelected={setSelectedFile}
                    onUploadError={(err) => alert('Ошибка загрузки: ' + err)}
                    acceptedTypes={getAcceptedTypes(formData.block_type)}
                    filePrefix={getFilePrefix(formData.block_type)}
                    currentFileUrl={editingBlock?.content_url ? buildFileUrl(editingBlock.content_url) || undefined : undefined}
                    disabled={saving}
                  />
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      Или URL файла:
                    </label>
                    <input
                      type="text"
                      value={formData.content_url}
                      onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {formData.block_type !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={formData.content_text}
                    onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                    rows={3}
                    placeholder="Необязательно"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-y"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : editingBlock ? 'Сохранить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechniqueBlocksManager;
