/**
 * Открывает внешнюю ссылку во внутреннем браузере Telegram
 * Использует нативный Telegram WebApp API
 */
export const openExternalLink = (url: string) => {
  try {
    const WebApp = window.Telegram?.WebApp;

    // Проверяем, является ли ссылка Telegram-ссылкой (t.me или telegram.me)
    const isTelegramLink = /^https?:\/\/(t\.me|telegram\.me)\//i.test(url);

    if (isTelegramLink && WebApp?.openTelegramLink) {
      // Telegram-ссылки открываются напрямую без confirmation sheet
      WebApp.openTelegramLink(url);
    } else if (WebApp?.openLink) {
      // Внешние ссылки - пробуем открыть в in-app браузере
      WebApp.openLink(url, { try_instant_view: true });
    } else {
      // Fallback на window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.warn('Telegram WebApp openLink failed:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
