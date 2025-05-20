import { useState, useEffect } from 'react';
import { Section, Cell, Button, Spinner } from '@telegram-apps/telegram-ui';
import { logger } from '@/lib/logger';

/**
 * Компонент для проверки статуса сервера и отображения диагностической информации
 */
export const ServerStatus: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Функция для проверки статуса сервера
  const checkServerStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Пробуем сначала Edge endpoint
      try {
        const response = await fetch('/api/server-info-edge');
        if (response.ok) {
          const data = await response.json();
          setServerInfo({ ...data, endpoint: 'edge' });
          return;
        }
      } catch (edgeError) {
        logger.debug('Edge server info failed, trying standard endpoint', edgeError);
      }
      
      // Если Edge endpoint недоступен, пробуем стандартный
      const response = await fetch('/api/server-info');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setServerInfo({ ...data, endpoint: 'standard' });
    } catch (err) {
      logger.error('Failed to fetch server info', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  // Запрашиваем информацию при монтировании компонента
  useEffect(() => {
    checkServerStatus();
  }, []);

  // Форматирует объект для отображения
  const formatObject = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (err) {
      return 'Error formatting data';
    }
  };

  return (
    <Section 
      header="Server Status" 
      footer={error ? `Error: ${error.message}` : 'Diagnostic information about the server environment'}>
      
      {loading ? (
        <Cell before={<Spinner size="m" />}>
          Checking server status...
        </Cell>
      ) : serverInfo ? (
        <>
          <Cell subtitle={`Endpoint: ${serverInfo.endpoint}`}>
            {serverInfo.runtime || serverInfo.node_version || 'Server is running'}
          </Cell>
          
          <Cell subtitle="Environment">
            {serverInfo.environment || serverInfo.vercel?.environment || 'Unknown'}
          </Cell>
          
          {expanded && (
            <Cell multiline>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                fontSize: '12px',
                padding: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {formatObject(serverInfo)}
              </pre>
            </Cell>
          )}
          
          <Cell>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={checkServerStatus} size="m">
                Refresh
              </Button>
              <Button 
                onClick={() => setExpanded(!expanded)} 
                size="m" 
                mode="outline">
                {expanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </Cell>
        </>
      ) : (
        <Cell subtitle={error ? error.message : 'Unable to get server information'}>
          Server status unavailable
        </Cell>
      )}
      
    </Section>
  );
}; 