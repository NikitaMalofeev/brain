import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  useGrantTechniqueAccess,
  useUserTechniqueAccess,
  useRevokeTechniqueAccess,
} from '@/lib/supabase/hooks/useTechniqueSchedule';
import { logger } from '@/lib/logger';

interface GrantTechniqueAccessModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

const GrantTechniqueAccessModal: React.FC<GrantTechniqueAccessModalProps> = ({
  userId,
  userName,
  onClose,
}) => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState('');
  const [accessSource, setAccessSource] = useState<'purchase' | 'tariff' | 'gift' | 'free'>('gift');
  const [durationType, setDurationType] = useState<'forever' | '1' | '3' | '6' | '12' | 'custom'>(
    'forever'
  );
  const [customMonths, setCustomMonths] = useState(1);

  // Получить все техники
  const { data: techniques } = useQuery({
    queryKey: ['all-techniques'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('techniques')
        .select('id, title, status, available_from_module')
        .order('order_num');

      if (error) {
        logger.error('Error fetching techniques', { error });
        throw error;
      }

      return data || [];
    },
  });

  // Получить текущие доступы пользователя
  const { data: userAccess, isLoading: isLoadingAccess } = useUserTechniqueAccess(userId);

  const grantAccessMutation = useGrantTechniqueAccess();
  const revokeAccessMutation = useRevokeTechniqueAccess();

  const calculateExpiresAt = (): string | null => {
    if (durationType === 'forever') return null;

    const months = durationType === 'custom' ? customMonths : parseInt(durationType);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  };

  const handleGrantAccess = async () => {
    if (!selectedTechniqueId) {
      alert('Выберите технику');
      return;
    }

    try {
      await grantAccessMutation.mutateAsync({
        userId,
        techniqueId: selectedTechniqueId,
        accessSource,
        expiresAt: calculateExpiresAt(),
      });

      alert('Доступ предоставлен');
      setSelectedTechniqueId('');
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Ошибка при выдаче доступа');
    }
  };

  const handleRevokeAccess = async (techniqueId: string, techniqueTitle: string) => {
    if (!confirm(`Отозвать доступ к технике "${techniqueTitle}"?`)) return;

    try {
      await revokeAccessMutation.mutateAsync({ userId, techniqueId });
      alert('Доступ отозван');
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Ошибка при отзыве доступа');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Навсегда';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Управление доступом к техникам</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Информация о пользователе */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold">Пользователь: {userName}</h3>
            <p className="text-sm text-gray-600">ID: {userId}</p>
          </div>

          {/* Форма выдачи доступа */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Выдать доступ к технике</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Техника</label>
              <select
                value={selectedTechniqueId}
                onChange={(e) => setSelectedTechniqueId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Выберите технику...</option>
                {techniques?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.title}
                    {tech.available_from_module && ` (${tech.available_from_module})`}
                    {tech.status === 'free' ? ' - Бесплатная' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Источник доступа
                </label>
                <select
                  value={accessSource}
                  onChange={(e) =>
                    setAccessSource(e.target.value as 'purchase' | 'tariff' | 'gift' | 'free')
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="gift">Подарок (gift)</option>
                  <option value="purchase">Покупка (purchase)</option>
                  <option value="tariff">Тариф (tariff)</option>
                  <option value="free">Бесплатная (free)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Срок действия
                </label>
                <select
                  value={durationType}
                  onChange={(e) =>
                    setDurationType(
                      e.target.value as 'forever' | '1' | '3' | '6' | '12' | 'custom'
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="forever">Навсегда</option>
                  <option value="1">1 месяц</option>
                  <option value="3">3 месяца</option>
                  <option value="6">6 месяцев</option>
                  <option value="12">12 месяцев</option>
                  <option value="custom">Свой срок</option>
                </select>
              </div>
            </div>

            {durationType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество месяцев
                </label>
                <input
                  type="number"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(parseInt(e.target.value) || 1)}
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <Button
              onClick={handleGrantAccess}
              disabled={grantAccessMutation.isPending}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              {grantAccessMutation.isPending ? 'Выдача доступа...' : 'Выдать доступ'}
            </Button>
          </div>

          {/* Список текущих доступов */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Текущие доступы ({userAccess?.length || 0})</h3>

            {isLoadingAccess ? (
              <div className="text-center py-4 text-gray-500">Загрузка...</div>
            ) : userAccess && userAccess.length > 0 ? (
              <div className="space-y-2">
                {userAccess.map((access: any) => {
                  const expired = isExpired(access.expires_at);

                  return (
                    <div
                      key={access.id}
                      className={`border rounded-lg p-4 ${
                        expired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{access.technique.title}</h4>
                          <div className="flex gap-4 mt-1 text-sm text-gray-600">
                            <span>
                              Источник:{' '}
                              <span className="font-medium">{access.access_source}</span>
                            </span>
                            <span>
                              Выдан: {new Date(access.granted_at).toLocaleDateString('ru-RU')}
                            </span>
                            <span>
                              Срок: <span className="font-medium">{formatDate(access.expires_at)}</span>
                            </span>
                          </div>
                          {expired && (
                            <div className="mt-2 text-sm text-red-600 font-medium">
                              ⚠️ Доступ истёк
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() =>
                            handleRevokeAccess(access.technique_id, access.technique.title)
                          }
                          disabled={revokeAccessMutation.isPending}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Отозвать
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                У пользователя пока нет доступов к техникам
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <Button
            onClick={onClose}
            className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GrantTechniqueAccessModal;
