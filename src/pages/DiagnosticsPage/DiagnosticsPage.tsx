import { useState, useEffect } from 'react';
import { Section, Cell, Button, Spinner, List } from '@telegram-apps/telegram-ui';
import { initDataState as _initDataState, useSignal } from '@telegram-apps/sdk-react';
import type { FC } from 'react';

import { Page } from '@/components/Page.tsx';
import { ServerStatus } from '@/components/ServerStatus/ServerStatus';
import { logger } from '@/lib/logger';
import { checkSupabaseConnection, checkServerEndpoints } from '@/lib/supabase/utils/debugUtils';
import { supabase } from '@/lib/supabase/client';

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

// Интерфейс для диагностики схемы БД
interface DatabaseSchemaCheck {
  lessonsTable: {
    exists: boolean;
    hasCoverImagePath: boolean;
    columns: string[];
  };
  stagesTable: {
    exists: boolean;
    hasCoverImagePath: boolean;
    columns: string[];
  };
}

export const DiagnosticsPage: FC = () => {
  const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<SupabaseConnectionResult | null>(null);
  const [databaseSchemaStatus, setDatabaseSchemaStatus] = useState<DatabaseSchemaCheck | null>(null);

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

  // Функция для проверки схемы БД
  const checkDatabaseSchema = async () => {
    setLoading(true);

    try {
      logger.info('Checking database schema');

      if (!supabase) {
        throw new Error('Supabase client is not available');
      }

      // Простая проверка схемы - делаем запрос к таблице и смотрим на структуру данных
      let lessonsSchemaInfo = { exists: false, hasCoverImagePath: false, columns: [] as string[] };
      let stagesSchemaInfo = { exists: false, hasCoverImagePath: false, columns: [] as string[] };

      // Проверяем таблицу lessons
      try {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .limit(1);

        if (!lessonsError) {
          lessonsSchemaInfo.exists = true;
          if (lessonsData && lessonsData.length > 0) {
            lessonsSchemaInfo.columns = Object.keys(lessonsData[0]);
            lessonsSchemaInfo.hasCoverImagePath = lessonsSchemaInfo.columns.includes('cover_image_path');
          } else {
            // Если таблица пустая, но запрос прошел успешно - таблица существует
            lessonsSchemaInfo.exists = true;
            lessonsSchemaInfo.columns = ['table_exists_but_empty'];
            lessonsSchemaInfo.hasCoverImagePath = false;
          }
        } else {
          console.error('Lessons table check failed:', lessonsError);
        }
      } catch (err) {
        console.error('Error checking lessons table:', err);
      }

      // Проверяем таблицу course_stages
      try {
        const { data: stagesData, error: stagesError } = await supabase
          .from('course_stages')
          .select('*')
          .limit(1);

        if (!stagesError) {
          stagesSchemaInfo.exists = true;
          if (stagesData && stagesData.length > 0) {
            stagesSchemaInfo.columns = Object.keys(stagesData[0]);
            stagesSchemaInfo.hasCoverImagePath = stagesSchemaInfo.columns.includes('cover_image_path');
          } else {
            stagesSchemaInfo.exists = true;
            stagesSchemaInfo.columns = ['table_exists_but_empty'];
            stagesSchemaInfo.hasCoverImagePath = false;
          }
        } else {
          console.error('Stages table check failed:', stagesError);
        }
      } catch (err) {
        console.error('Error checking stages table:', err);
      }

      setDatabaseSchemaStatus({
        lessonsTable: lessonsSchemaInfo,
        stagesTable: stagesSchemaInfo
      });

      // Дополнительная диагностика - логируем в консоль
      console.log('🔍 ДИАГНОСТИКА СХЕМЫ БД:');
      console.log('📚 Lessons table:', lessonsSchemaInfo);
      console.log('📊 Stages table:', stagesSchemaInfo);

      logger.info('Database schema check complete', {
        lessonsTable: lessonsSchemaInfo,
        stagesTable: stagesSchemaInfo
      });

    } catch (err) {
      logger.error('Failed to check database schema', err);
      console.error('❌ Database schema check failed:', err);
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
        runServerCheck(),
        checkDatabaseSchema()
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
              <Button onClick={checkDatabaseSchema} size="m" mode="outline" disabled={loading}>
                Check DB Schema
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

        {/* Статус схемы БД */}
        <Section header="Database Schema">
          {databaseSchemaStatus ? (
            <>
              <Cell
                subtitle={`Lessons table: ${databaseSchemaStatus.lessonsTable.exists ? 'exists' : 'missing'}, cover_image_path: ${databaseSchemaStatus.lessonsTable.hasCoverImagePath ? 'present' : 'missing'}`}
              >
                Lessons Table Schema
              </Cell>
              <Cell
                subtitle={`Stages table: ${databaseSchemaStatus.stagesTable.exists ? 'exists' : 'missing'}, cover_image_path: ${databaseSchemaStatus.stagesTable.hasCoverImagePath ? 'present' : 'missing'}`}
              >
                Course Stages Table Schema
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
                    {formatObject(databaseSchemaStatus)}
                  </pre>
                </Cell>
              )}
            </>
          ) : (
            <Cell>
              Database schema not checked yet
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