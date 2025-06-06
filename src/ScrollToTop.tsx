import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
    // useLocation «подписывает» на изменения маршрута
    const { pathname } = useLocation();

    useEffect(() => {
        // Когда pathname изменился, прокручиваем окно наверх
        window.scrollTo(0, 0);
    }, [pathname]);

    // Ничего не рендерим
    return null;
}
