import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Plus, Edit2, Trash2, Copy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreamEditorNew from './StreamEditorNew';
import CopyStreamModal from './CopyStreamModal';

interface Stream {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

/**
 * Админка для управления потоками обучения
 * Позволяет создавать, редактировать, удалять и копировать потоки
 */
const StreamsManager: React.FC = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copyingStreamId, setCopyingStreamId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Получить все потоки
  const { data: streams, isLoading } = useQuery({
    queryKey: ['admin-streams'],
    queryFn: async (): Promise<Stream[]> => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Fetching streams for admin');

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        logger.error('Error fetching streams', { error });
        throw error;
      }

      logger.debug('Streams fetched', { count: data?.length });
      return data || [];
    },
  });

  // Удалить поток
  const deleteStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      logger.debug('Deleting stream', { streamId });

      const { error } = await supabase.from('streams').delete().eq('id', streamId);

      if (error) {
        logger.error('Error deleting stream', { streamId, error });
        throw error;
      }

      logger.debug('Stream deleted', { streamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
    },
  });

  const handleDelete = async (streamId: string, name: string) => {
    if (
      !confirm(
        `Вы уверены, что хотите удалить поток "${name}"?\n\nВСЕ модули и события этого потока также будут удалены!`
      )
    ) {
      return;
    }

    try {
      await deleteStreamMutation.mutateAsync(streamId);
      alert('Поток удален');
    } catch (error) {
      alert('Ошибка при удалении потока');
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedStreamId(null);
  };

  const handleEdit = (streamId: string) => {
    setSelectedStreamId(streamId);
    setIsCreating(false);
  };

  const handleCloseEditor = () => {
    setSelectedStreamId(null);
    setIsCreating(false);
  };

  const handleCopy = (streamId: string) => {
    setCopyingStreamId(streamId);
  };

  const handleCloseCopyModal = () => {
    setCopyingStreamId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B862EA] mb-2"></div>
          <p className="text-sm text-[#666]">Загрузка потоков...</p>
        </div>
      </div>
    );
  }

  // Если открыт редактор
  if (isCreating || selectedStreamId) {
    return (
      <StreamEditorNew
        streamId={selectedStreamId}
        onClose={handleCloseEditor}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
          handleCloseEditor();
        }}
      />
    );
  }

  // Если открыто модальное окно копирования
  if (copyingStreamId) {
    const streamToCopy = streams?.find((s) => s.id === copyingStreamId);
    return (
      <CopyStreamModal
        stream={streamToCopy!}
        onClose={handleCloseCopyModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-streams'] });
          handleCloseCopyModal();
        }}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#242424]">Управление потоками</h2>
          <p className="text-sm text-gray-500 mt-1">
            Потоки — это группы учеников с общим графиком обучения
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Создать поток
        </Button>
      </div>

      {/* Список потоков */}
      {streams && streams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              {/* Заголовок */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{stream.name}</h3>
                  {stream.description && (
                    <p className="text-sm text-gray-500 mt-1">{stream.description}</p>
                  )}
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </div>

              {/* Даты */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Начало:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(stream.start_date)}
                  </span>
                </div>
                {stream.end_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Конец:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(stream.end_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Действия */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(stream.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Редактировать</span>
                </button>
                <button
                  onClick={() => handleCopy(stream.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Копировать"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Копировать</span>
                </button>
                <button
                  onClick={() => handleDelete(stream.id, stream.name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-4">Нет созданных потоков</p>
          <Button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg"
          >
            Создать первый поток
          </Button>
        </div>
      )}
    </div>
  );
};

export default StreamsManager;
