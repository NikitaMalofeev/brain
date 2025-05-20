import { FC } from 'react';
import './Stats.css';

interface StatsProps {
  strength: number;
  practiceMinutes: number;
  daysInFlow: number;
  onSelectPractice?: () => void;
  className?: string;
}

const Stats: FC<StatsProps> = ({ 
  practiceMinutes, 
  daysInFlow, 
  onSelectPractice,
  className = ''
}) => {
  return (
    <section className={`stats-container ${className}`} aria-label="Статистика практики">
      <div className="meditation-image-container" aria-hidden="true">
        <img 
          src="/mediman.png" 
          alt="Медитирующий человек" 
          className="meditation-image"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      
      <div className="stats-card">
        <div className="stats-row">
          <div className="stats-item">
            <div className="stats-value">{practiceMinutes}</div>
            <div className="stats-label" aria-label={`Минут практики: ${practiceMinutes}`}>минут практики</div>
          </div>
          
          <div className="stats-item">
            <div className="stats-value">{daysInFlow}</div>
            <div className="stats-label" aria-label={`Дней в потоке: ${daysInFlow}`}>дней в потоке</div>
          </div>
        </div>
        
        <button 
          className="practice-button" 
          onClick={onSelectPractice}
          aria-label="Выбрать практику"
        >
          <span>Выбрать практику</span>
          <span className="arrow-icon" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
};

export default Stats; 