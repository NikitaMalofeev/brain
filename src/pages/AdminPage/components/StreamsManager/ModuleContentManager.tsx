import React, { useState } from 'react';
import { Segmented } from 'antd';
import ModuleTechniquesManager from './ModuleTechniquesManager';
import ModuleLessonsManager from './ModuleLessonsManager';

interface ModuleContentManagerProps {
  streamModuleId: string;
  streamId: string;
  courseId: string;
  moduleName: string;
  moduleDurationDays?: number;
}

type ContentType = 'techniques' | 'lessons';

const ModuleContentManager: React.FC<ModuleContentManagerProps> = ({
  streamModuleId,
  streamId,
  courseId,
  moduleName,
  moduleDurationDays = 21,
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
        <ModuleTechniquesManager
          streamModuleId={streamModuleId}
          moduleName={moduleName}
          moduleDurationDays={moduleDurationDays}
        />
      ) : (
        <ModuleLessonsManager
          streamModuleId={streamModuleId}
          streamId={streamId}
          courseId={courseId}
          moduleName={moduleName}
        />
      )}
    </div>
  );
};

export default ModuleContentManager;
