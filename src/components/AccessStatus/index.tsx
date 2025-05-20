import React from 'react';
import { useAccessCheck, formatAccessDate } from '../../lib/supabase/hooks';
import './AccessStatus.css';

interface AccessStatusProps {
  userId: string | null;
  showDetails?: boolean;
}

/**
 * Компонент для отображения статуса доступа пользователя
 * Показывает дату окончания доступа и статус (активен/неактивен)
 */
const AccessStatus: React.FC<AccessStatusProps> = ({ userId, showDetails = true }) => {
  const { isLoading, hasAccess, accessTill, isAdmin, error } = useAccessCheck(userId);

  if (isLoading) {
    return <div className="access-status access-status--loading">Проверка доступа...</div>;
  }

  if (error) {
    return <div className="access-status access-status--error">{error}</div>;
  }

  return (
    <div className={`access-status ${hasAccess ? 'access-status--active' : 'access-status--expired'}`}>
      <div className="access-status__icon">
        {hasAccess ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
      </div>
      
      <div className="access-status__content">
        <div className="access-status__status">
          {isAdmin ? 'Админский доступ' : (hasAccess ? 'Доступ активен' : 'Доступ истек')}
        </div>
        
        {showDetails && (
          <div className="access-status__details">
            {isAdmin ? (
              <span>Неограниченный доступ</span>
            ) : accessTill ? (
              <span>
                {hasAccess ? 'Действует до: ' : 'Истек: '}
                {formatAccessDate(accessTill)}
              </span>
            ) : (
              <span>Срок действия не указан</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessStatus; 