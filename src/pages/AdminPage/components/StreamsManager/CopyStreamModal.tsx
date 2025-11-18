import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { X, Copy } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
}

interface CopyStreamModalProps {
  stream: Stream;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Модальное окно для копирования потока с новыми датами
 * Использует SQL функцию copy_stream для автоматического копирования
 * всех модулей и событий с новыми датами
 */
const CopyStreamModal: React.FC<CopyStreamModalProps> = ({ stream, onClose, onSuccess }) => {
  const [newName, setNewName] = useState(`${stream.name} (копия)`);
  const [newStartDate, setNewStartDate] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newStartDate) {
      alert('Заполните все поля');
      return;
    }

    setIsCopying(true);

    try {
      logger.debug('Copying stream', {
        originalStreamId: stream.id,
        newName,
        newStartDate,
      });

      // Вызвать SQL функцию copy_stream
      const { data, error } = await supabase!.rpc('copy_stream', {
        p_original_stream_id: stream.id,
        p_new_stream_name: newName.trim(),
        p_new_start_date: newStartDate,
      });

      if (error) {
        logger.error('Error copying stream', { error });
        throw error;
      }

      logger.debug('Stream copied successfully', { newStreamId: data });
      alert('Поток успешно скопирован!\n\nВсе модули и события скопированы с новыми датами.');
      onSuccess();
    } catch (error) {
      console.error('Error copying stream:', error);
      alert('Ошибка при копировании потока');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Copy className="w-6 h-6 text-[#B862EA]" />
            <h3 className="text-xl font-bold text-gray-900">Копировать поток</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <form onSubmit={handleCopy} className="p-6 space-y-4">
          {/* Исходный поток */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Исходный поток:</p>
            <p className="font-semibold text-gray-900">{stream.name}</p>
            <p className="text-sm text-gray-600 mt-1">
              Дата начала: {new Date(stream.start_date).toLocaleDateString('ru-RU')}
            </p>
          </div>

          {/* Название нового потока */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название нового потока <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              placeholder="Поток Декабрь 2025"
              required
            />
          </div>

          {/* Новая дата начала */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Новая дата начала <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B862EA] focus:border-transparent"
              required
            />
          </div>

          {/* Подсказка */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Автоматически скопируется:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              <li>Все модули потока</li>
              <li>Все события календаря</li>
              <li>Настройки доступа по тарифам</li>
              <li>Даты событий будут сдвинуты на новую дату начала</li>
            </ul>
          </div>

          {/* Кнопки */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isCopying}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isCopying}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B862EA] to-[#8E44AD] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isCopying ? (
                <>
                  <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Копирование...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Копировать поток
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CopyStreamModal;
