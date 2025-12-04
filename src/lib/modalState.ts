/**
 * Глобальный стейт для модалок
 * Позволяет модалкам перехватывать кнопку назад в Telegram
 */

type ModalCloseHandler = () => void;

let activeModalHandler: ModalCloseHandler | null = null;

/**
 * Регистрирует активную модалку для перехвата кнопки назад
 */
export function registerModalBackHandler(handler: ModalCloseHandler): void {
  activeModalHandler = handler;
}

/**
 * Снимает регистрацию модалки
 */
export function unregisterModalBackHandler(): void {
  activeModalHandler = null;
}

/**
 * Проверяет есть ли активная модалка и вызывает её обработчик
 * Возвращает true если модалка была закрыта, false если модалки нет
 */
export function handleModalBack(): boolean {
  if (activeModalHandler) {
    activeModalHandler();
    return true;
  }
  return false;
}

/**
 * Проверяет есть ли активная модалка
 */
export function hasActiveModal(): boolean {
  return activeModalHandler !== null;
}
