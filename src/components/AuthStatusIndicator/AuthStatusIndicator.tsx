import { FC } from 'react';
import './AuthStatusIndicator.css';

interface AuthStatusIndicatorProps {
  isAuthenticated: boolean;
  className?: string;
}

const AuthStatusIndicator: FC<AuthStatusIndicatorProps> = ({ 
  isAuthenticated, 
  className = ''
}) => {
  const status = isAuthenticated ? 'authenticated' : 'unauthenticated';
  const statusText = isAuthenticated ? 'Авторизован' : 'Не авторизован';
  
  return (
    <div 
      className={`auth-status-indicator ${status} ${className}`} 
      title={statusText}
      role="status"
      aria-label={statusText}
    >
      <span className="visually-hidden">{statusText}</span>
    </div>
  );
};

export default AuthStatusIndicator; 