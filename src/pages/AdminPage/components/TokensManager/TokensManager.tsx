import React, { useState } from 'react';
import { useTokensAdmin, TokenCreationData } from '@/lib/supabase/hooks/useTokensAdmin';
import { useCoursesAdmin } from '@/lib/supabase/hooks/useCoursesAdmin';
import { useTariffsAdmin } from '@/lib/supabase/hooks/useTariffsAdmin';
import { BOT_CONFIG } from '@/lib/config/constants';
import './TokensManager.css';

const TokensManager = () => {
    const { tokens, isLoading, error, createTokens, isCreating, revokeToken, isRevoking } = useTokensAdmin();
    const { courses } = useCoursesAdmin();
    const { tariffs } = useTariffsAdmin();

    const [creationData, setCreationData] = useState<Omit<TokenCreationData, 'comment'>>({
        count: 1,
        course_id: '',
        tariff_id: '',
    });

    const handleCreateTokens = async (e: React.FormEvent) => {
        e.preventDefault();
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
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="course-select">Курс</label>
                        <select
                            id="course-select"
                            value={creationData.course_id}
                            onChange={(e) => setCreationData({ ...creationData, course_id: e.target.value, tariff_id: '' })}
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
                            value={creationData.tariff_id}
                            onChange={(e) => setCreationData({ ...creationData, tariff_id: e.target.value })}
                            required
                            disabled={!creationData.course_id}
                        >
                            <option value="" disabled>Выберите тариф</option>
                            {/* TODO: Filter tariffs by course */}
                            {tariffs.map(tariff => (
                                <option key={tariff.id} value={tariff.id}>{tariff.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="count-input">Количество</label>
                        <input
                            id="count-input"
                            type="number"
                            min="1"
                            max="1000"
                            value={creationData.count}
                            onChange={(e) => setCreationData({ ...creationData, count: parseInt(e.target.value, 10) })}
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="admin-button" disabled={isCreating}>
                    {isCreating ? 'Создание...' : 'Сгенерировать'}
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
                                    <td><span className={`status-badge status-${token.status}`}>{token.status}</span></td>
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
                                        <button onClick={() => handleCopyLink(token.token)} className="admin-button-sm">Копировать</button>
                                        {token.status === 'created' && (
                                            <button onClick={() => handleRevokeToken(token.id)} className="admin-button-sm danger" disabled={isRevoking}>Отозвать</button>
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