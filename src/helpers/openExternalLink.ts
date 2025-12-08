/**
 * Открывает внешнюю ссылку во внутреннем браузере Telegram
 * Использует нативный Telegram WebApp API
 */
export const openExternalLink = (url: string) => {
  try {
    // Используем нативный Telegram WebApp API
    if (window.Telegram?.WebApp?.openLink) {
      // openLink с try_instant_view пытается открыть во внутреннем браузере Telegram
      window.Telegram.WebApp.openLink(url, { try_instant_view: true });
    } else {
      // Fallback на window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.warn('Telegram WebApp openLink failed:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
