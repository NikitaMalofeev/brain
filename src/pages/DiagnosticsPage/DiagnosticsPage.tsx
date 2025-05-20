import { useState, useEffect } from 'react';
import { Section, Cell, Button, Spinner, List } from '@telegram-apps/telegram-ui';
import { initDataState as _initDataState, useSignal } from '@telegram-apps/sdk-react';
import type { FC } from 'react';

import { Page } from '@/components/Page.tsx';
import { ServerStatus } from '@/components/ServerStatus/ServerStatus';
import { logger } from '@/lib/logger';
import { checkSupabaseConnection, checkServerEndpoints } from '@/lib/supabase/utils/debugUtils';

// Определяем интерфейс для результата проверки Supabase
interface SupabaseConnectionResult {
  connected: boolean;
  error: string | null;
  usersTableCount: number | null;
  realtimeConnected: boolean;
  features: {
    authEnabled: boolean;
    realtimeEnabled: boolean;
    signUp: boolean;
  } | null;
}

export const DiagnosticsPage: FC = () => {
  const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<SupabaseConnectionResult | null>(null);
  
  const [serverStatus, setServerStatus] = useState<{
    success: boolean;
    results: Record<string, any>;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Получаем initData из Telegram SDK для отображения
  const initDataState = useSignal(_initDataState);
  
  // Запускаем диагностику Supabase соединения
  const runSupabaseCheck = async () => {
    setLoading(true);
    
    try {
      logger.info('Running Supabase connection check');
      const result = await checkSupabaseConnection();
      setSupabaseConnectionStatus(result);
      logger.info('Supabase check complete', { connected: result.connected });
    } catch (err) {
      logger.error('Failed to check Supabase connection', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Запускаем проверку серверных эндпоинтов
  const runServerCheck = async () => {
    setLoading(true);
    
    try {
      logger.info('Running server endpoints check');
      const result = await checkServerEndpoints();
      setServerStatus(result);
      logger.info('Server check complete', { success: result.success });
    } catch (err) {
      logger.error('Failed to check server endpoints', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Запускаем все проверки
  const runAllChecks = async () => {
    setLoading(true);
    
    try {
      logger.info('Running all diagnostics');
      await Promise.all([
        runSupabaseCheck(),
        runServerCheck()
      ]);
      logger.info('All diagnostics complete');
    } catch (err) {
      logger.error('Failed to run all diagnostics', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Запускаем базовые проверки при монтировании
  useEffect(() => {
    runAllChecks();
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
    <Page back>
      <List>
        {/* Заголовок */}
        <Section>
          <Cell>
            <h2 style={{ margin: 0 }}>Diagnostics</h2>
          </Cell>
        </Section>
        
        {/* Секция с кнопками управления */}
        <Section header="Diagnostic Tools">
          <Cell>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button onClick={runAllChecks} size="m" disabled={loading}>
                Run All Checks
              </Button>
              <Button onClick={runSupabaseCheck} size="m" mode="outline" disabled={loading}>
                Check Supabase
              </Button>
              <Button onClick={runServerCheck} size="m" mode="outline" disabled={loading}>
                Check Server
              </Button>
              <Button 
                onClick={() => setExpanded(!expanded)} 
                size="m" 
                mode="outline"
                disabled={loading}
              >
                {expanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </Cell>
          
          {loading && (
            <Cell before={<Spinner size="m" />}>
              Running diagnostics...
            </Cell>
          )}
        </Section>
        
        {/* Статус Telegram initData */}
        <Section header="Telegram Init Data">
          <Cell multiline>
            {initDataState ? (
              <>
                <div>User ID: {initDataState.user?.id || 'N/A'}</div>
                <div>Username: {initDataState.user?.username || 'N/A'}</div>
                <div>Auth Date: {initDataState.auth_date ? new Date(Number(initDataState.auth_date) * 1000).toLocaleString() : 'N/A'}</div>
                <div>Start Param: {initDataState.start_param || 'N/A'}</div>
              </>
            ) : (
              'Telegram initData not available'
            )}
          </Cell>
          
          {expanded && initDataState && (
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
                {formatObject(initDataState)}
              </pre>
            </Cell>
          )}
        </Section>
        
        {/* Статус подключения Supabase */}
        <Section 
          header="Supabase Connection" 
          footer={supabaseConnectionStatus?.error || undefined}
        >
          <Cell subtitle={
            supabaseConnectionStatus 
              ? (supabaseConnectionStatus.connected ? 'Connected successfully' : 'Connection failed') 
              : 'Connection status unknown'
          }>
            {supabaseConnectionStatus 
              ? (supabaseConnectionStatus.connected ? 'Supabase connected' : 'Supabase disconnected') 
              : 'Checking Supabase...'}
          </Cell>
          
          {expanded && supabaseConnectionStatus && (
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
                {formatObject({
                  usersCount: supabaseConnectionStatus.usersTableCount,
                  realtimeConnected: supabaseConnectionStatus.realtimeConnected,
                  features: supabaseConnectionStatus.features
                })}
              </pre>
            </Cell>
          )}
        </Section>
        
        {/* Статус сервера */}
        <ServerStatus />
        
        {/* Результаты проверки эндпоинтов */}
        {expanded && serverStatus && (
          <Section header="API Endpoints">
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
                {formatObject(serverStatus.results)}
              </pre>
            </Cell>
          </Section>
        )}
      </List>
    </Page>
  );
}; 