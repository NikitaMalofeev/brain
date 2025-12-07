import React, { useState } from 'react';
import { Segmented } from 'antd';
import TariffModuleMaterialsManager from './TariffModuleMaterialsManager';
import TariffModuleLessonsManager from './TariffModuleLessonsManager';
import { TariffModuleConfig } from '@/lib/supabase/hooks/useTariffConfiguration';
import { ModuleInfo } from '@/lib/supabase/hooks/useSpecialBundles';

interface Material {
  id: string;
  name: string;
  material_type: 'video' | 'audio';
}

interface TariffModuleContentManagerProps {
  module: TariffModuleConfig;
  allMaterials: Material[];
  moduleDurationDays?: number;
  streamId: string;
  courseId: string;
  allTariffModuleIds: string[]; // Все ID модулей тарифа для проверки размещений спец.пакетов
  allModulesInfo: ModuleInfo[]; // Информация о всех модулях для расчёта расположения техник
  streamStartDate?: string; // Дата начала потока для вычисления дат дней
}

type ContentType = 'techniques' | 'lessons';

const TariffModuleContentManager: React.FC<TariffModuleContentManagerProps> = ({
  module,
  allMaterials,
  moduleDurationDays,
  streamId,
  courseId,
  allTariffModuleIds,
  allModulesInfo,
  streamStartDate,
}) => {
  const [contentType, setContentType] = useState<ContentType>('techniques');

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Переключатель между Техниками и Уроками */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        <Segmented
          options={[
            { label: 'Техники', value: 'techniques' },
            { label: 'Уроки', value: 'lessons' },
          ]}
          value={contentType}
          onChange={(value) => setContentType(value as ContentType)}
          size="large"
        />
      </div>

      {/* Отображаем соответствующий менеджер */}
      {contentType === 'techniques' ? (
        <TariffModuleMaterialsManager
          module={module}
          allMaterials={allMaterials}
          moduleDurationDays={moduleDurationDays}
          allTariffModuleIds={allTariffModuleIds}
          allModulesInfo={allModulesInfo}
          streamStartDate={streamStartDate}
          moduleUnlockOffset={module.unlock_offset_days}
        />
      ) : (
        <TariffModuleLessonsManager
          streamModuleId={module.stream_module_id}
          tariffStreamModuleId={module.tariff_stream_module_id}
          streamId={streamId}
          courseId={courseId}
          moduleName={module.module_name}
          moduleDurationDays={moduleDurationDays}
          allModulesInfo={allModulesInfo}
          streamStartDate={streamStartDate}
          moduleUnlockOffset={module.unlock_offset_days}
        />
      )}
    </div>
  );
};

export default TariffModuleContentManager;
