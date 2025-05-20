/**
 * Сервис для логирования приложения
 * Отправляет логи на серверный endpoint и в консоль
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string | number;
}

class Logger {
  private standardLogEndpoint = '/api/log';
  private edgeLogEndpoint = '/api/log-edge';
  private enabled = true;
  private debugEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true';

  constructor() {
    // В production логи отправляются на сервер
    // В development среде они только выводятся в консоль
    this.enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_FORCE_LOGS === 'true';
  }

  /**
   * Отправляет лог на сервер
   */
  private async sendLog(logData: LogMessage): Promise<void> {
    if (!this.enabled) return;

    try {
      // Добавляем navigator.userAgent и другие данные для отладки
      const enhancedLogData = {
        ...logData,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      };

      // Сначала пробуем отправить на Edge endpoint
      try {
        const response = await fetch(this.edgeLogEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enhancedLogData),
        });
        
        if (response.ok) {
          return; // Успешно отправлено
        }
      } catch (edgeError) {
        console.debug('Edge log endpoint failed, falling back to standard endpoint', edgeError);
      }
      
      // Если Edge endpoint не доступен, используем стандартный
      await fetch(this.standardLogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedLogData),
      });
    } catch (error) {
      // В случае ошибки при отправке - выводим в консоль
      console.error('Failed to send log to server:', error);
    }
  }

  /**
   * Форматирует объект для консоли
   */
  private formatForConsole(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
  }

  /**
   * Создает объект лога
   */
  private createLogObject(level: LogLevel, message: string, data?: any): LogMessage {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
    };
  }

  /**
   * Получает ID текущего пользователя (если доступен)
   */
  private getCurrentUserId(): string | number | undefined {
    try {
      // Попытка получить ID из initData Telegram
      const initDataString = localStorage.getItem('tma-init-data');
      if (initDataString) {
        const parsedData = JSON.parse(initDataString);
        if (parsedData?.user?.id) {
          return parsedData.user.id;
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Отладочный лог (только в dev среде)
   */
  public debug(message: string, data?: any): void {
    if (!this.debugEnabled) return;
    
    const logObj = this.createLogObject('debug', message, data);
    console.debug(this.formatForConsole('debug', message, data));
    
    if (this.enabled) {
      this.sendLog(logObj);
    }
  }

  /**
   * Информационный лог
   */
  public info(message: string, data?: any): void {
    const logObj = this.createLogObject('info', message, data);
    console.info(this.formatForConsole('info', message, data));
    
    if (this.enabled) {
      this.sendLog(logObj);
    }
  }

  /**
   * Предупреждающий лог
   */
  public warn(message: string, data?: any): void {
    const logObj = this.createLogObject('warn', message, data);
    console.warn(this.formatForConsole('warn', message, data));
    
    if (this.enabled) {
      this.sendLog(logObj);
    }
  }

  /**
   * Лог ошибки
   */
  public error(message: string, data?: any): void {
    const logObj = this.createLogObject('error', message, data);
    console.error(this.formatForConsole('error', message, data));
    
    if (this.enabled) {
      this.sendLog(logObj);
    }
  }
}

export const logger = new Logger(); 