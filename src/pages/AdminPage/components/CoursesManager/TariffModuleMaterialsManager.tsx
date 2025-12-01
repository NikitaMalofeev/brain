import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Space,
  Typography,
  Empty,
  Spin,
  Button,
  InputNumber,
  Popconfirm,
  Modal,
  Row,
  Col,
  message,
  Input,
} from 'antd';
import {
  DeleteOutlined,
  DragOutlined,
  SearchOutlined,
  DownOutlined,
  UpOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import {
  useAddTechniqueToTariffModule,
  useRemoveTechniqueFromTariffModule,
  TariffModuleConfig,
} from '@/lib/supabase/hooks/useTariffConfiguration';
import {
  useSpecialBundles,
  useSpecialBundlePlacements,
  useSpecialBundleTechniquesAcrossModules,
  useAllSpecialBundlePlacementsForTariff,
  usePlaceSpecialBundle,
  useRemoveSpecialBundlePlacement,
  SpecialBundle,
  SpecialBundleTechniqueAcrossModules,
  ModuleInfo,
} from '@/lib/supabase/hooks/useSpecialBundles';

const { Text } = Typography;

interface Material {
  id: string;
  name: string;
  material_type: 'video' | 'audio';
  description?: string | null;
  duration_seconds?: number | null;
}

interface TariffModuleMaterial {
  id: string;
  tariff_stream_module_id: string;
  material_id: string;
  unlock_offset_days: number;
  active_days: number | null;
  order_num: number;
  material?: Material;
}

interface TariffModuleMaterialsManagerProps {
  module: TariffModuleConfig;
  allMaterials: Material[];
  moduleDurationDays?: number; // Количество дней доступа к модулю
  allTariffModuleIds: string[]; // Все ID модулей тарифа для проверки размещений спец.пакетов
  allModulesInfo: ModuleInfo[]; // Информация о всех модулях для расчёта расположения техник
}

// Хук для получения материалов модуля тарифа
function useModuleMaterials(tariffStreamModuleId: string) {
  return useQuery({
    queryKey: ['tariff-module-materials', tariffStreamModuleId],
    queryFn: async (): Promise<TariffModuleMaterial[]> => {
      if (!supabase || !tariffStreamModuleId) return [];
      const { data, error } = await supabase
        .from('tariff_module_materials')
        .select(`
          id,
          tariff_stream_module_id,
          material_id,
          unlock_offset_days,
          active_days,
          order_num,
          material:materials(id, name, material_type, description, duration_seconds)
        `)
        .eq('tariff_stream_module_id', tariffStreamModuleId)
        .order('unlock_offset_days', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        material: item.material as unknown as Material
      }));
    },
    enabled: !!tariffStreamModuleId,
  });
}

const TariffModuleMaterialsManager: React.FC<TariffModuleMaterialsManagerProps> = ({
  module,
  allMaterials,
  moduleDurationDays,
  allTariffModuleIds,
  allModulesInfo,
}) => {
  const [draggedMaterial, setDraggedMaterial] = useState<Material | null>(null);
  const [draggedSpecialBundle, setDraggedSpecialBundle] = useState<SpecialBundle | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addMaterialModal, setAddMaterialModal] = useState<{
    materialId: string;
    materialName: string;
  } | null>(null);
  const [addSpecialBundleModal, setAddSpecialBundleModal] = useState<{
    bundleId: string;
    bundleName: string;
  } | null>(null);
  const [unlockDay, setUnlockDay] = useState<number>(1);
  const [activeDays, setActiveDays] = useState<number | null>(null);
  const [customModuleDays, setCustomModuleDays] = useState<number>(14);
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);

  // Используем количество дней доступа к модулю из конфигурации тарифа или введенное значение
  const moduleDaysCount = moduleDurationDays || customModuleDays;

  const { data: moduleMaterials, isLoading } = useModuleMaterials(module.tariff_stream_module_id);
  const addMaterialMutation = useAddTechniqueToTariffModule();
  const removeMaterialMutation = useRemoveTechniqueFromTariffModule();

  // Специальные пакеты
  const { data: specialBundles } = useSpecialBundles();
  const { data: specialBundlePlacements } = useSpecialBundlePlacements(module.tariff_stream_module_id);
  // Получаем техники спец.пакетов по ВСЕМ модулям с расчётом целевого модуля
  const { data: allTechniquesAcrossModules } = useSpecialBundleTechniquesAcrossModules(allModulesInfo);
  // Получаем размещения по ВСЕМ модулям тарифа для проверки, что пакет уже размещен
  const { data: allTariffPlacements } = useAllSpecialBundlePlacementsForTariff(allTariffModuleIds);
  const placeSpecialBundleMutation = usePlaceSpecialBundle();
  const removeSpecialBundlePlacementMutation = useRemoveSpecialBundlePlacement();

  // Доступные специальные пакеты (которые ещё не размещены НИ В ОДНОМ модуле тарифа)
  const availableSpecialBundles = useMemo(() => {
    if (!specialBundles) return [];
    if (!allTariffPlacements) return specialBundles;
    // Собираем ID всех размещённых пакетов по всему тарифу
    const placedIds = new Set(allTariffPlacements.map(p => p.special_bundle_id));
    return specialBundles.filter(b => !placedIds.has(b.id));
  }, [specialBundles, allTariffPlacements]);

  // Техники спец.пакетов для ТЕКУЩЕГО модуля, сгруппированные по дням
  // Если day_in_target_module = 0, считаем как день 1
  const specialBundleTechniquesByDay = useMemo(() => {
    if (!allTechniquesAcrossModules) return {};
    const result: Record<number, SpecialBundleTechniqueAcrossModules[]> = {};
    // Фильтруем только техники, которые должны отображаться в текущем модуле
    for (const tech of allTechniquesAcrossModules) {
      if (tech.target_module_id === module.tariff_stream_module_id) {
        const day = tech.day_in_target_module || 1;
        if (!result[day]) result[day] = [];
        result[day].push(tech);
      }
    }
    return result;
  }, [allTechniquesAcrossModules, module.tariff_stream_module_id]);

  // Карточки спец.пакетов (для отображения заголовка в дне старта - только для пакетов размещённых в ЭТОМ модуле)
  // Если start_unlock_offset_days = 0, считаем как день 1
  const specialBundlesByDay = useMemo(() => {
    if (!specialBundlePlacements) return {};
    const result: Record<number, typeof specialBundlePlacements> = {};
    for (const placement of specialBundlePlacements) {
      const day = placement.start_unlock_offset_days || 1;
      if (!result[day]) result[day] = [];
      result[day].push(placement);
    }
    return result;
  }, [specialBundlePlacements]);

  // Доступные материалы (которые ещё не добавлены в модуль)
  const availableMaterials = useMemo(() => {
    console.log('🎵 [DEBUG] allMaterials:', allMaterials?.length, allMaterials);
    console.log('🎵 [DEBUG] moduleMaterials:', moduleMaterials?.length, moduleMaterials);
    if (!allMaterials || !moduleMaterials) return allMaterials || [];
    const addedIds = new Set(moduleMaterials.map(mm => mm.material_id));
    const available = allMaterials.filter(m => !addedIds.has(m.id));
    console.log('🎵 [DEBUG] availableMaterials (not added yet):', available.length, available);
    return available;
  }, [allMaterials, moduleMaterials]);

  // Отфильтрованные материалы по поисковому запросу
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return availableMaterials;
    const lowerQuery = searchQuery.toLowerCase();
    return availableMaterials.filter(m =>
      m.name.toLowerCase().includes(lowerQuery)
    );
  }, [availableMaterials, searchQuery]);

  // Материалы сгруппированные по дням
  // unlock_offset_days: старые данные могут быть 0-indexed, новые 1-indexed
  // Если 0 - считаем как день 1
  const materialsByDay = useMemo(() => {
    if (!moduleMaterials) return {};
    const result: Record<number, TariffModuleMaterial[]> = {};
    for (const mm of moduleMaterials) {
      const day = mm.unlock_offset_days || 1;
      if (!result[day]) result[day] = [];
      result[day].push(mm);
    }
    console.log('📅 [TariffMaterialsGrid] tariff_stream_module_id:', module.tariff_stream_module_id);
    console.log('📅 [TariffMaterialsGrid] materialsByDay:', result);
    console.log('📅 [TariffMaterialsGrid] ALL moduleMaterials from DB:', moduleMaterials);
    return result;
  }, [moduleMaterials, module.tariff_stream_module_id]);

  const isMutating = addMaterialMutation.isPending || removeMaterialMutation.isPending ||
    placeSpecialBundleMutation.isPending || removeSpecialBundlePlacementMutation.isPending;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleExpand = (id: string) => {
    setExpandedTechniqueId(expandedTechniqueId === id ? null : id);
  };

  const handleDrop = (day: number) => {
    // Если перетаскиваем специальный пакет
    if (draggedSpecialBundle) {
      setAddSpecialBundleModal({
        bundleId: draggedSpecialBundle.id,
        bundleName: draggedSpecialBundle.name,
      });
      setUnlockDay(day);
      setDraggedSpecialBundle(null);
      return;
    }
    // Если перетаскиваем материал
    if (!draggedMaterial) return;
    setAddMaterialModal({
      materialId: draggedMaterial.id,
      materialName: draggedMaterial.name,
    });
    setUnlockDay(day);
    setActiveDays(null);
    setDraggedMaterial(null);
  };

  const handleConfirmAddSpecialBundle = async () => {
    if (!addSpecialBundleModal) return;
    if (unlockDay < 1 || unlockDay > moduleDaysCount) {
      message.error(`День должен быть от 1 до ${moduleDaysCount}`);
      return;
    }
    try {
      await placeSpecialBundleMutation.mutateAsync({
        special_bundle_id: addSpecialBundleModal.bundleId,
        tariff_stream_module_id: module.tariff_stream_module_id,
        start_unlock_offset_days: unlockDay,
      });
      message.success('Специальный пакет размещён');
      setAddSpecialBundleModal(null);
      setUnlockDay(1);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при размещении');
    }
  };

  const handleRemoveSpecialBundlePlacement = async (placementId: string) => {
    try {
      await removeSpecialBundlePlacementMutation.mutateAsync(placementId);
      message.success('Специальный пакет удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  const handleConfirmAddMaterial = async () => {
    if (!addMaterialModal) return;
    if (unlockDay < 1 || unlockDay > moduleDaysCount) {
      message.error(`День должен быть от 1 до ${moduleDaysCount}`);
      return;
    }
    if (activeDays !== null && activeDays < 1) {
      message.error('Количество дней доступа должно быть больше 0');
      return;
    }
    try {
      await addMaterialMutation.mutateAsync({
        tariff_stream_module_id: module.tariff_stream_module_id,
        technique_id: addMaterialModal.materialId,
        unlock_offset_days: unlockDay,
        active_days: activeDays,
        order_num: (moduleMaterials?.length || 0) + 1,
      });
      message.success('Материал добавлен');
      setAddMaterialModal(null);
      setUnlockDay(1);
      setActiveDays(null);
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при добавлении');
    }
  };

  const handleRemoveMaterial = async (mm: TariffModuleMaterial) => {
    try {
      await removeMaterialMutation.mutateAsync(mm.id);
      message.success('Материал удалён');
    } catch (err: any) {
      message.error(err?.message || 'Ошибка при удалении');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* Инпут для количества дней если не указано */}
        {!moduleDurationDays && (
          <Card size="small">
            <Space>
              <Text strong>Количество дней в модуле:</Text>
              <InputNumber
                min={1}
                max={365}
                value={customModuleDays}
                onChange={(value) => setCustomModuleDays(value || 14)}
                style={{ width: 100 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                (не задано в конфигурации, используется для отображения сетки)
              </Text>
            </Space>
          </Card>
        )}

        <Row gutter={24}>
          {/* Доступные материалы и специальные пакеты */}
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Специальные пакеты */}
              {availableSpecialBundles.length > 0 && (
                <Card
                  size="small"
                  title={
                    <Space>
                      <GiftOutlined style={{ color: '#722ed1' }} />
                      <span>Спец. пакеты</span>
                    </Space>
                  }
                  style={{ borderColor: '#722ed1' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {availableSpecialBundles.map((bundle) => (
                      <Card
                        key={bundle.id}
                        size="small"
                        draggable
                        onDragStart={() => setDraggedSpecialBundle(bundle)}
                        onDragEnd={() => setDraggedSpecialBundle(null)}
                        style={{
                          cursor: 'grab',
                          background: '#f9f0ff',
                          borderColor: '#722ed1',
                        }}
                        bodyStyle={{ padding: 8 }}
                      >
                        <Space>
                          <DragOutlined style={{ color: '#722ed1' }} />
                          <GiftOutlined style={{ color: '#722ed1' }} />
                          <Text ellipsis style={{ maxWidth: 100, color: '#722ed1' }}>
                            {bundle.name}
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Материалы */}
              <Card size="small" title="Доступные материалы">
                <Input
                  placeholder="Поиск по названию"
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 12 }}
                  allowClear
                />
                {isLoading ? (
                  <Spin />
                ) : availableMaterials.length === 0 ? (
                  <Empty description="Все материалы добавлены" />
                ) : filteredMaterials.length === 0 ? (
                  <Empty description="Нет результатов" />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {filteredMaterials.map((material) => (
                      <Card
                        key={material.id}
                        size="small"
                        draggable
                        onDragStart={() => setDraggedMaterial(material)}
                        onDragEnd={() => setDraggedMaterial(null)}
                        style={{ cursor: 'grab' }}
                        bodyStyle={{ padding: 8 }}
                      >
                        <Space>
                          <DragOutlined />
                          {material.material_type === 'audio' ? '🎵' : '🎬'}
                          <Text ellipsis style={{ maxWidth: 120 }}>
                            {material.name}
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>
            </Space>
          </Col>

          {/* Сетка дней */}
          <Col span={18}>
            <Card size="small" title="Дни модуля (когда открывается материал)">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {Array.from({ length: moduleDaysCount }, (_, i) => i + 1).map((day) => {
                  const hasMaterials = materialsByDay[day]?.length > 0;
                  const hasSpecialBundleTechniques = specialBundleTechniquesByDay[day]?.length > 0;
                  const hasSpecialBundleStart = specialBundlesByDay[day]?.length > 0;
                  const hasContent = hasMaterials || hasSpecialBundleTechniques;
                  const isDragging = draggedMaterial || draggedSpecialBundle;

                  return (
                  <div
                    key={day}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(day)}
                    style={{
                      position: 'relative',
                      minHeight: 100,
                      minWidth: 140,
                      maxWidth: 200,
                      flex: '1 1 140px',
                      padding: 8,
                      borderRadius: 6,
                      border: `2px solid ${
                        isDragging
                          ? draggedSpecialBundle ? '#722ed1' : '#1890ff'
                          : hasContent
                          ? '#722ed1'
                          : '#d9d9d9'
                      }`,
                      background: isDragging
                        ? draggedSpecialBundle ? '#f9f0ff' : '#e6f7ff'
                        : hasContent
                        ? '#f9f0ff'
                        : '#fafafa',
                    }}
                  >
                    <Text strong style={{ fontSize: 12 }}>
                      День {day}
                    </Text>
                    {/* Иконка удаления в правом верхнем углу */}
                    {hasMaterials && (
                      <Popconfirm
                        title={`Удалить ${materialsByDay[day].length > 1 ? 'все материалы' : 'материал'}?`}
                        onConfirm={() => {
                          materialsByDay[day].forEach(mm => handleRemoveMaterial(mm));
                        }}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <DeleteOutlined
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontSize: 14,
                            color: '#ff4d4f',
                            cursor: 'pointer',
                          }}
                        />
                      </Popconfirm>
                    )}
                    {materialsByDay[day]?.map((mm) => {
                      const isExpanded = expandedTechniqueId === mm.id;
                      return (
                        <Card
                          key={mm.id}
                          size="small"
                          style={{ marginTop: 4, cursor: 'pointer' }}
                          bodyStyle={{ padding: 8 }}
                          onClick={() => handleToggleExpand(mm.id)}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            {/* Заголовок с названием */}
                            <Space size={4} style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Space size={4}>
                                {mm.material?.material_type === 'audio' ? '🎵' : '🎬'}
                                <Text
                                  ellipsis={!isExpanded}
                                  style={{
                                    fontSize: 12,
                                    maxWidth: isExpanded ? 'none' : 80,
                                    fontWeight: 500,
                                  }}
                                >
                                  {mm.material?.name}
                                </Text>
                              </Space>
                              {isExpanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
                            </Space>

                            {/* Раскрытая информация */}
                            {isExpanded && (
                              <div style={{
                                borderTop: '1px solid #e8e8e8',
                                paddingTop: 8,
                                marginTop: 4,
                              }}>
                                {/* Описание */}
                                {mm.material?.description && (
                                  <Text
                                    type="secondary"
                                    style={{
                                      fontSize: 11,
                                      display: 'block',
                                      marginBottom: 6,
                                      whiteSpace: 'pre-wrap',
                                    }}
                                  >
                                    {mm.material.description}
                                  </Text>
                                )}

                                {/* Мета информация */}
                                <Space size={8} wrap>
                                  <Text type="secondary" style={{ fontSize: 10 }}>
                                    {mm.material?.material_type === 'audio' ? '🎵 Аудио' : '🎬 Видео'}
                                  </Text>
                                  {mm.material?.duration_seconds && (
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                      ⏱️ {formatDuration(mm.material.duration_seconds)}
                                    </Text>
                                  )}
                                  {mm.active_days && (
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                      📅 {mm.active_days} дн.
                                    </Text>
                                  )}
                                </Space>
                              </div>
                            )}
                          </Space>
                        </Card>
                      );
                    })}

                    {/* Заголовок спец.пакета (только в дне старта) с кнопкой удаления */}
                    {hasSpecialBundleStart && specialBundlesByDay[day]?.map((placement) => (
                      <Card
                        key={`header-${placement.id}`}
                        size="small"
                        style={{
                          marginTop: 4,
                          background: '#722ed1',
                          borderColor: '#722ed1',
                        }}
                        bodyStyle={{ padding: 6 }}
                      >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space size={4}>
                            <GiftOutlined style={{ color: '#fff' }} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#fff',
                              }}
                            >
                              {placement.special_bundle?.name}
                            </Text>
                          </Space>
                          <Popconfirm
                            title="Удалить специальный пакет?"
                            onConfirm={() => handleRemoveSpecialBundlePlacement(placement.id)}
                            okText="Да"
                            cancelText="Нет"
                          >
                            <DeleteOutlined
                              style={{
                                fontSize: 12,
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            />
                          </Popconfirm>
                        </Space>
                      </Card>
                    ))}

                    {/* Техники спец.пакетов в этом дне */}
                    {specialBundleTechniquesByDay[day]?.map((tech) => (
                      <Card
                        key={tech.id}
                        size="small"
                        style={{
                          marginTop: 4,
                          background: '#f9f0ff',
                          borderColor: '#d3adf7',
                        }}
                        bodyStyle={{ padding: 8 }}
                      >
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space size={4}>
                            <GiftOutlined style={{ color: '#722ed1', fontSize: 10 }} />
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#722ed1',
                              }}
                            >
                              {tech.special_bundle_name}
                            </Text>
                          </Space>
                          <Space size={4}>
                            {tech.technique?.material_type === 'audio' ? '🎵' : '🎬'}
                            <Text
                              ellipsis
                              style={{
                                fontSize: 12,
                                maxWidth: 100,
                                fontWeight: 500,
                              }}
                            >
                              {tech.technique?.name}
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            #{tech.technique_position}
                            {tech.delay_days > 0 && ` (+${tech.delay_days} дн.)`}
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        </Row>
      </Space>

      {/* Modal для добавления специального пакета */}
      <Modal
        title="Разместить специальный пакет"
        open={!!addSpecialBundleModal}
        onOk={handleConfirmAddSpecialBundle}
        onCancel={() => {
          setAddSpecialBundleModal(null);
          setUnlockDay(1);
        }}
        confirmLoading={isMutating}
        okText="Разместить"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Специальный пакет:</Text>{' '}
            <Text style={{ color: '#722ed1' }}>{addSpecialBundleModal?.bundleName}</Text>
          </div>

          <div>
            <Text strong>День открытия первой техники:</Text>
            <InputNumber
              min={1}
              max={moduleDaysCount}
              value={unlockDay + 1}
              onChange={(value) => setUnlockDay((value || 1) - 1)}
              style={{ width: '100%', marginTop: 8 }}
              placeholder={`От 1 до ${moduleDaysCount}`}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Первая техника из пакета откроется на {unlockDay + 1} день модуля.
              Последующие техники откроются автоматически по заданным интервалам.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Modal для добавления материала */}
      <Modal
        title="Добавить материал"
        open={!!addMaterialModal}
        onOk={handleConfirmAddMaterial}
        onCancel={() => {
          setAddMaterialModal(null);
          setUnlockDay(1);
          setActiveDays(null);
        }}
        confirmLoading={isMutating}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Материал:</Text> {addMaterialModal?.materialName}
          </div>

          <div>
            <Text strong>День открытия материала:</Text>
            <InputNumber
              min={1}
              max={moduleDaysCount}
              value={unlockDay + 1}
              onChange={(value) => setUnlockDay((value || 1) - 1)}
              style={{ width: '100%', marginTop: 8 }}
              placeholder={`От 1 до ${moduleDaysCount}`}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Материал откроется на {unlockDay + 1} день модуля
            </Text>
          </div>

          <div>
            <Text strong>Количество дней доступа к материалу:</Text>
            <InputNumber
              min={1}
              value={activeDays}
              onChange={(value) => setActiveDays(value)}
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Не ограничено (оставьте пустым)"
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              {activeDays
                ? `Материал будет доступен ${activeDays} дней после открытия`
                : 'Материал будет доступен без ограничения по времени'}
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default TariffModuleMaterialsManager;
