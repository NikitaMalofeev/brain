import React from 'react';
import './ModuleProgressBars.css';

interface ModuleProgress {
  moduleNumber: number;
  daysPassed: number;
  totalDays: number;
}

interface ModuleProgressBarsProps {
  modules: ModuleProgress[];
  currentModule: number;
}

/**
 * Компонент вертикальных полос прогресса модулей
 */
const ModuleProgressBars: React.FC<ModuleProgressBarsProps> = ({ modules, currentModule }) => {
  return (
    <div className="module-progress-container">
      {/* Заголовок */}
      <div className="module-progress-header">
        <p className="module-progress-label">Ваш уровень</p>
        <p className="module-progress-number">{currentModule}</p>
      </div>

      {/* Полосы прогресса */}
      <div className="module-progress-bars">
        {modules.map((module) => {
          // Вычисляем процент заполнения (от 0 до 100)
          const fillPercent = module.totalDays > 0
            ? Math.min(100, Math.max(0, (module.daysPassed / module.totalDays) * 100))
            : 0;

          return (
            <div key={module.moduleNumber} className="module-progress-bar">
              <div
                className="module-progress-bar-fill"
                style={{ height: `${fillPercent}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleProgressBars;
