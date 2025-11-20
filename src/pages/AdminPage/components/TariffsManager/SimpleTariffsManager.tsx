import React, { useState, useMemo } from 'react';
import { useTariffsAdmin, type Tariff, type TariffFormData } from '@/lib/supabase/hooks/useTariffsAdmin';

/**
 * Простой компонент управления тарифами (только CRUD)
 * Без настройки связей с потоками/модулями/техниками
 */
const SimpleTariffsManager: React.FC = () => {
  // ========== СОСТОЯНИЯ ==========
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentTariff, setCurrentTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState<TariffFormData>({
    name: '',
    code: '',
    description: '',
  });

  // ========== ХУКИ ==========
  const {
    tariffs,
    loading,
    error,
    createTariff,
    createTariffLoading,
    updateTariff,
    updateTariffLoading,
    deleteTariff,
    isMutating,
  } = useTariffsAdmin();

  // ========== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ==========
  const sortedTariffs = useMemo(() => {
    if (!tariffs || tariffs.length === 0) return [];
    return [...tariffs].sort((a, b) => a.code.localeCompare(b.code));
  }, [tariffs]);

  // ========== ОБРАБОТЧИКИ ==========
  const openCreateModal = () => {
    setFormData({ name: '', code: '', description: '' });
    setModalMode('add');
    setCurrentTariff(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tariff: Tariff) => {
    setFormData({
      name: tariff.name,
      code: tariff.code,
      description: tariff.description || '',
    });
    setModalMode('edit');
    setCurrentTariff(tariff);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTariff(null);
    setFormData({ name: '', code: '', description: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;

    try {
      if (modalMode === 'add') {
        await createTariff(formData);
      } else if (currentTariff) {
        await updateTariff(currentTariff.id, formData);
      }
      closeModal();
    } catch (err) {
      alert('Ошибка при сохранении тарифа: ' + (err as any)?.message);
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    if (!confirm(`Удалить тариф "${tariff.name}"? Это удалит все связи с потоками.`)) return;

    try {
      await deleteTariff(tariff.id);
    } catch (err) {
      alert('Ошибка при удалении тарифа: ' + (err as any)?.message);
    }
  };

  // ========== РЕНДЕР ==========
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Тарифы</h2>
          <p className="text-sm text-gray-600 mt-1">
            Управление базовыми тарифами. Настройка контента в разделе "Курсы".
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isMutating}
        >
          + Создать тариф
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Загрузка тарифов...</div>
      ) : sortedTariffs.length === 0 ? (
        <div className="text-gray-500">Нет тарифов. Создайте первый.</div>
      ) : (
        <div className="space-y-3">
          {sortedTariffs.map((tariff) => (
            <div
              key={tariff.id}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">{tariff.name}</h3>
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {tariff.code}
                    </span>
                  </div>
                  {tariff.description && (
                    <p className="text-sm text-gray-600 mt-1">{tariff.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(tariff)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                    disabled={isMutating}
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(tariff)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
                    disabled={isMutating}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Создать тариф' : 'Редактировать тариф'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название тарифа *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название тарифа..."
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={createTariffLoading || updateTariffLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Код тарифа *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="T1, T2, T3..."
                  maxLength={10}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  disabled={createTariffLoading || updateTariffLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Краткий код для идентификации (например: T1, T2, T3)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание тарифа..."
                  rows={4}
                  className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-vertical"
                  disabled={createTariffLoading || updateTariffLoading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={
                    createTariffLoading ||
                    updateTariffLoading ||
                    !formData.name.trim() ||
                    !formData.code.trim()
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTariffLoading || updateTariffLoading
                    ? 'Сохранение...'
                    : modalMode === 'add'
                      ? 'Создать'
                      : 'Сохранить'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={createTariffLoading || updateTariffLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTariffsManager;
