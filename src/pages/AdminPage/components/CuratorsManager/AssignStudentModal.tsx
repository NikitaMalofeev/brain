import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useCuratorActions, AvailableStudent } from '@/lib/supabase/hooks/useCuratorActions';

interface AssignStudentModalProps {
    visible: boolean;
    onClose: () => void;
    curatorId: string;
    onAssigned?: () => void;
}

const AssignStudentModal: React.FC<AssignStudentModalProps> = ({ visible, onClose, curatorId, onAssigned }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<AvailableStudent[]>([]);
    const { loading, error, assignStudent, getAvailableStudents } = useCuratorActions();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            getAvailableStudents(curatorId).then(students => {
                setAvailableStudents(students);
                setFilteredStudents(students);
                setSearchQuery('');
                setErrorMsg(null);
            });
        }
    }, [visible, curatorId]);

    // Fuse.js поиск
    useEffect(() => {
        setErrorMsg(null); // Сброс ошибки при новом поиске
        if (!searchQuery.trim()) {
            setFilteredStudents(availableStudents);
        } else {
            const fuse = new Fuse(availableStudents, {
                keys: ['full_name', 'telegram_id', 'course_title'],
                threshold: 0.3,
                includeScore: true,
            });
            const results = fuse.search(searchQuery);
            setFilteredStudents(results.map(result => result.item));
        }
    }, [searchQuery, availableStudents]);

    const handleAssignStudent = async (studentId: string) => {
        try {
            await assignStudent(curatorId, studentId);
            if (onAssigned) onAssigned();
            const students = await getAvailableStudents(curatorId);
            setAvailableStudents(students);
            setFilteredStudents(students.filter(s => {
                if (!searchQuery.trim()) return true;
                const fuse = new Fuse([s], {
                    keys: ['full_name', 'telegram_id', 'course_title'],
                    threshold: 0.3,
                    includeScore: true,
                });
                return fuse.search(searchQuery).length > 0;
            }));
            setErrorMsg(null);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Ошибка при назначении ученика');
        }
    };

    if (!visible) return null;

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
                <button className="admin-modal-close" onClick={onClose}>×</button>
                <h3>Назначить ученика</h3>
                <div className="form-group">
                    <input
                        type="text"
                        className="admin-input"
                        placeholder="Поиск по ФИО, Telegram ID или курсу..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                {errorMsg && (
                    <div className="admin-alert warning" style={{ marginBottom: 12 }}>
                        {errorMsg}
                    </div>
                )}
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Telegram ID</th>
                                <th>Курс</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>
                                        {searchQuery.trim()
                                            ? 'Ученики не найдены по запросу'
                                            : 'Нет доступных учеников для назначения'}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => (
                                    <tr key={student.id}>
                                        <td>{student.full_name}</td>
                                        <td>{student.telegram_id || '—'}</td>
                                        <td>{student.course_title}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="admin-button"
                                                onClick={() => handleAssignStudent(student.id)}
                                                disabled={loading}
                                            >
                                                {loading ? 'Назначение...' : 'Назначить'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AssignStudentModal; 