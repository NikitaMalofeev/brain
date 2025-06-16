import React, { useState } from 'react';
import {
    useTokensAdmin,
    TokenCreationData,
    PersonalTokenData,
    getTokenDisplayStatus,
    getTokenStatusCssClass,
    PERSONAL_TOKEN_MESSAGES
} from '@/lib/supabase/hooks/useTokensAdmin';
import { useCoursesAdmin } from '@/lib/supabase/hooks/useCoursesAdmin';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import { BOT_CONFIG } from '@/lib/config/constants';
import './TokensManager.css';

// Типы токенов для переключателя
type TokenType = 'regular' | 'personal';

const TokensManager = () => {
    const {
        tokens,
        isLoading,
        error,
        createTokens,
        isCreating,
        revokeToken,
        isRevoking,
        assignPersonalToken,
        isAssigning
    } = useTokensAdmin();
    const { courses } = useCoursesAdmin();
    const { tariffs } = useTariffsAdmin();

    // Состояние для типа токена
    const [tokenType, setTokenType] = useState<TokenType>('regular');

    // Состояние для обычных токенов
    const [creationData, setCreationData] = useState<Omit<TokenCreationData, 'comment'>>({
        count: 1,
        course_id: '',
        tariff_id: '',
    });

    // Состояние для персональных токенов
    const [personalData, setPersonalData] = useState<Omit<PersonalTokenData, 'comment'>>({
        tg_id: 0,
        course_id: '',
        tariff_id: '',
    });

    // Функция получения типа токена для отображения
    const getTokenTypeDisplay = (token: typeof tokens[0]) => {
        if (token.tg_id) {
            return `Персональный (TG: ${token.tg_id})`;
        }
        return 'Обычный';
    };

    const handleCreateTokens = async (e: React.FormEvent) => {
        e.preventDefault();

        if (tokenType === 'regular') {
            // Логика для обычных токенов
            if (!creationData.course_id || !creationData.tariff_id || creationData.count < 1) {
                alert('Пожалуйста, выберите курс, тариф и укажите количество токенов (минимум 1).');
                return;
            }
            try {
                await createTokens(creationData);
                alert(`${creationData.count} токен(ов) успешно создано!`);
                // Reset form
                setCreationData({ count: 1, course_id: '', tariff_id: '' });
            } catch (e: any) {
                alert(`Ошибка при создании токенов: ${e.message}`);
            }
        } else {
            // Логика для персональных токенов
            if (!personalData.course_id || !personalData.tariff_id || !personalData.tg_id) {
                alert('Пожалуйста, выберите курс, тариф и укажите Telegram ID.');
                return;
            }
            try {
                console.log('🎯 [UI] Отправляем запрос на создание персонального токена:', personalData);
                const result = await assignPersonalToken(personalData);
                console.log('🎉 [UI] Персональный токен успешно создан! Результат:', result);

                // Показываем успешное сообщение с деталями
                alert(result?.displayMessage || PERSONAL_TOKEN_MESSAGES.SUCCESS_PENDING);

                // Reset form
                setPersonalData({ tg_id: 0, course_id: '', tariff_id: '' });
            } catch (e: any) {
                console.error('💥 [UI] Ошибка при создании персонального токена:', e);
                // Ошибки уже отформатированы в хуке согласно константам
                alert(e.message);
            }
        }
    };

    const handleCopyLink = (token: string) => {
        const link = `https://t.me/${BOT_CONFIG.BOT_NAME}?startapp=${token}`;
        navigator.clipboard.writeText(link);
        alert('Ссылка скопирована в буфер обмена!');
    };

    const handleRevokeToken = async (id: string) => {
        if (window.confirm('Вы уверены, что хотите отозвать этот токен? Это действие необратимо.')) {
            try {
                await revokeToken(id);
                alert('Токен успешно отозван.');
            } catch (e: any) {
                alert(`Ошибка при отзыве токена: ${e.message}`);
            }
        }
    }

    return (
        <div className="admin-card tokens-manager-container">
            <h2>Управление токенами доступа</h2>

            <form onSubmit={handleCreateTokens} className="token-creation-form">
                <h3>Создать новые токены</h3>
                {tokenType === 'personal' && (
                    <div className="personal-token-info">
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
                            <strong>Персональные токены</strong> создаются для конкретного пользователя и активируются автоматически.
                            Система проверит, что у пользователя нет других активных тарифов.
                        </p>
                    </div>
                )}

                {/* Переключатель типа токена */}
                <div className="form-group">
                    <label>Тип токена</label>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="tokenType"
                                value="regular"
                                checked={tokenType === 'regular'}
                                onChange={() => setTokenType('regular')}
                            />
                            Обычные токены
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="tokenType"
                                value="personal"
                                checked={tokenType === 'personal'}
                                onChange={() => setTokenType('personal')}
                            />
                            Персональные токены
                        </label>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="course-select">Курс</label>
                        <select
                            id="course-select"
                            value={tokenType === 'regular' ? creationData.course_id : personalData.course_id}
                            onChange={(e) => {
                                if (tokenType === 'regular') {
                                    setCreationData({ ...creationData, course_id: e.target.value, tariff_id: '' });
                                } else {
                                    setPersonalData({ ...personalData, course_id: e.target.value, tariff_id: '' });
                                }
                            }}
                            required
                        >
                            <option value="" disabled>Выберите курс</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="tariff-select">Тариф</label>
                        <select
                            id="tariff-select"
                            value={tokenType === 'regular' ? creationData.tariff_id : personalData.tariff_id}
                            onChange={(e) => {
                                if (tokenType === 'regular') {
                                    setCreationData({ ...creationData, tariff_id: e.target.value });
                                } else {
                                    setPersonalData({ ...personalData, tariff_id: e.target.value });
                                }
                            }}
                            required
                            disabled={tokenType === 'regular' ? !creationData.course_id : !personalData.course_id}
                        >
                            <option value="" disabled>Выберите тариф</option>
                            {/* TODO: Filter tariffs by course */}
                            {tariffs.map(tariff => (
                                <option key={tariff.id} value={tariff.id}>{tariff.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Поле количества для обычных токенов */}
                    {tokenType === 'regular' && (
                        <div className="form-group">
                            <label htmlFor="count-input">Количество</label>
                            <input
                                id="count-input"
                                type="number"
                                min="1"
                                max="100"
                                value={creationData.count}
                                onChange={(e) => setCreationData({ ...creationData, count: parseInt(e.target.value, 10) })}
                                required
                            />
                            <small className="form-help">От 1 до 100 токенов за раз</small>
                        </div>
                    )}

                    {/* Поле Telegram ID для персональных токенов */}
                    {tokenType === 'personal' && (
                        <div className="form-group">
                            <label htmlFor="tg-id-input">Telegram ID пользователя</label>
                            <input
                                id="tg-id-input"
                                type="number"
                                placeholder="Например: 123456789"
                                value={personalData.tg_id || ''}
                                onChange={(e) => setPersonalData({ ...personalData, tg_id: parseInt(e.target.value, 10) || 0 })}
                                required
                            />
                            <small className="form-help">
                                ID можно получить от пользователя или из админки студентов<br />
                            </small>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="admin-button"
                    disabled={isCreating || isAssigning}
                >
                    {(isCreating || isAssigning)
                        ? 'Обработка...'
                        : tokenType === 'regular'
                            ? 'Создать ссылки'
                            : 'Назначить тариф пользователю'
                    }
                </button>
            </form>

            <h3>Список токенов</h3>
            {isLoading && <div className="admin-loading">Загрузка токенов...</div>}
            {error && <div className="admin-error">Ошибка: {error.message}</div>}

            {!isLoading && !error && (
                <div className="admin-table responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Токен</th>
                                <th>Тип токена</th>
                                <th>Статус</th>
                                <th>Курс</th>
                                <th>Тариф</th>
                                <th>Использован</th>
                                <th>Дата создания</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.map(token => (
                                <tr key={token.id}>
                                    <td><code className="token-value">{token.token}</code></td>
                                    <td>
                                        <span className={`token-type-badge ${token.tg_id ? 'personal' : 'regular'}`}>
                                            {getTokenTypeDisplay(token)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getTokenStatusCssClass(token)}`}>
                                            {getTokenDisplayStatus(token)}
                                        </span>
                                    </td>
                                    <td>{token.courses?.title || 'N/A'}</td>
                                    <td>{token.tariffs?.name || 'N/A'}</td>
                                    <td>
                                        {token.users
                                            ? `${token.users.first_name}${token.users.last_name ? ' ' + token.users.last_name : ''}`
                                            : (token.status === 'used' ? 'N/A' : '')
                                        }
                                    </td>
                                    <td>{new Date(token.created_at).toLocaleString()}</td>
                                    <td>
                                        {/* Кнопка копирования только для обычных токенов */}
                                        {!token.tg_id && (
                                            <button onClick={() => handleCopyLink(token.token)} className="admin-button-sm">
                                                Копировать
                                            </button>
                                        )}
                                        {token.status === 'created' && (
                                            <button
                                                onClick={() => handleRevokeToken(token.id)}
                                                className="admin-button-sm danger"
                                                disabled={isRevoking}
                                            >
                                                Отозвать
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TokensManager; 