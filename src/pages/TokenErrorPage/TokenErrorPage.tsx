import { useLocation } from 'react-router-dom';
import './TokenErrorPage.css';

const TokenErrorPage = () => {
    const location = useLocation();
    const { error } = location.state || {};

    // Определяем тип ошибки
    const isNoAccessError = !error;

    const errorMessage = error || 'Для доступа к приложению требуется активация кода доступа.';
    const title = isNoAccessError ? 'Требуется код доступа' : 'Ошибка активации кода';

    const handleSupportClick = () => {
        // TODO: Replace with actual support chat link from config
        window.open('https://t.me/your_support_chat', '_blank');
    };


    return (
        <div className="token-error-page-container">
            <div className="error-card">
                <h1>{title}</h1>
                <p className="error-message">
                    {errorMessage}
                </p>
                {isNoAccessError ? (
                    <p>Получите код доступа от администратора или обратитесь в поддержку.</p>
                ) : (
                    <p>Пожалуйста, проверьте правильность ссылки или обратитесь в поддержку.</p>
                )}
                <div className="button-group">
                    <button onClick={handleSupportClick} className="support-button">
                        Написать в поддержку
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokenErrorPage; 