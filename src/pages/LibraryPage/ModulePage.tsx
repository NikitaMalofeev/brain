import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignal, initDataState } from '@telegram-apps/sdk-react';
import { Page } from '@/components/Page';
import LessonCard from '@/components/LessonCard/LessonCard';
import { useModuleDetails } from '@/lib/supabase/hooks/useModuleDetails';
import { buildFileUrl } from '@/lib/supabase/supabaseStorageService';
import { LessonData } from '@/lib/supabase/hooks/useStageDetails';
import { useSupabaseUser } from '@/lib/supabase/hooks';
import { useGuestStatus } from '@/lib/supabase/hooks/useIsGuest';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';
import NativeModal from '@/components/NativeModal';
import GuestBlockedModal from '@/components/GuestBlockedModal';
import { Ripple } from '@/components/ui/Ripple/Ripple';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { getNounPluralForm } from '@/helpers/pluralize';

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      ease: 'easeOut',
      duration: 0.3,
    },
  },
};

const ModulePage: React.FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();

  const [isOpen, setIsOpen] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const navigate = useNavigate();

  // Получаем информацию из глобального контекста
  const { isTelegramApp } = useAppContext();

  // Получаем initData из Telegram SDK если мы в Telegram
  const initDataSignal = useSignal(initDataState);

  // Получаем данные пользователя
  const { supabaseUser, loading: supabaseUserLoading, error: supabaseUserError } = useSupabaseUser(initDataSignal);

  // Проверяем статус гостя
  const { isGuest } = useGuestStatus(supabaseUser?.id);

  // Получаем детали модуля
  const { moduleDetails, loading: moduleLoading, error: moduleError } = useModuleDetails(
    supabaseUser?.id,
    moduleId
  );

  // Автоскролл к текущему уроку
  useEffect(() => {
    if (!moduleDetails || !moduleDetails.lessons || moduleDetails.lessons.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Находим первый разблокированный незавершенный урок
      const currentLesson = moduleDetails.lessons.find(
        (lesson) => lesson.is_unlocked && !lesson.is_completed
      );

      if (currentLesson) {
        const element = document.getElementById(`lesson-${currentLesson.lesson_id}`);
        if (element) {
          logger.debug('Auto-scrolling to current lesson', { lessonId: currentLesson.lesson_id });
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [moduleDetails]);

  // Объединяем состояния загрузки
  const loading = moduleLoading || (isTelegramApp && supabaseUserLoading);

  // Объединяем ошибки
  const error = moduleError || (isTelegramApp && supabaseUserError);

  // Обработчик клика на урок
  const handleLessonClick = (lessonId: string | number) => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    logger.debug('Navigating to lesson', { lessonId });
    navigate(`/library/lesson/${lessonId}`);
  };

  if (loading) {
    return (
      <Page>
        <div className="profile-loading">
          <div className="profile-loading-spinner" aria-hidden="true" />
          <p>Загрузка прогресса по урокам...</p>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
          Ошибка загрузки: {error.message}
        </div>
      </Page>
    );
  }

  if (!moduleDetails) {
    return (
      <Page>
        <div style={{ textAlign: 'center', marginTop: '50px' }}>Модуль не найден</div>
      </Page>
    );
  }

  // Для гостей показываем все уроки как заблокированные
  const completedLessons = isGuest ? 0 : moduleDetails.lessons.filter((lesson) => lesson.is_completed).length;
  const unlockedLessons = isGuest ? 0 : moduleDetails.lessons.filter((lesson) => lesson.is_unlocked).length;
  const totalLessons = moduleDetails.lessons.length;
  const lessonsRemaining = totalLessons - completedLessons;
  const lessonsLocked = totalLessons - unlockedLessons;

  let progressText = '';
  if (isGuest) {
    progressText = 'Станьте учеником, чтобы открыть доступ к урокам';
  } else if (lessonsLocked > 0) {
    const word = getNounPluralForm(lessonsLocked, 'день', 'дня', 'дней');
    progressText = `Еще ${lessonsLocked} ${word} до полного открытия модуля`;
  } else if (lessonsRemaining > 0) {
    const word = getNounPluralForm(lessonsRemaining, 'задание', 'задания', 'заданий');
    progressText = `Еще ${lessonsRemaining} ${word} до завершения модуля`;
  } else {
    progressText = 'Модуль пройден!';
  }

  // Преобразуем уроки модуля в формат для LessonCard
  // Для гостей все уроки помечаем как заблокированные
  const lessonsForCard: LessonData[] = moduleDetails.lessons.map((lesson) => ({
    lesson_id: Number(lesson.lesson_id),
    lesson_name: lesson.lesson_title, // LessonCard ожидает lesson_name
    content_type: lesson.lesson_type,
    order_num: lesson.order_num,
    has_assignment: lesson.has_assignment,
    is_unlocked: isGuest ? false : lesson.is_unlocked,
    is_completed: isGuest ? false : lesson.is_completed,
    submission_status: lesson.submission_status as LessonData['submission_status'],
    total_assignments: 0,
    completed_assignments: 0,
  }));

  return (
    <Page showTabBar={false}>
      <div className="text-black min-h-full">
        <div className="bg-white p-4 flex flex-col gap-3 p-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="font-bold text-xl">{moduleDetails.module_name}</p>
              <p className="text-sm text-[#8C8C8C]">{progressText}</p>
            </div>
            <Ripple className="rounded-full overflow-hidden">
              <img
                onClick={() => setIsOpen(true)}
                src="/ask-icon.svg"
                alt=""
                className="cursor-pointer"
              />
            </Ripple>
          </div>
          <div className="flex items-center gap-1 w-full">
            {Array.from({ length: totalLessons }).map((_, i) => (
              <div
                key={i}
                className={clsx('flex-1 h-4 bg-[#68B1EB] rounded-xs', {
                  'bg-[#C8DCF7]': i >= unlockedLessons,
                })}
              />
            ))}
          </div>
        </div>
        <motion.div
          className="bg-[url('/bg3.jpg')] min-h-full bg-cover bg-top p-4 rounded-t-3xl flex-1 flex flex-col gap-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {lessonsForCard.map((lesson) => (
            <motion.div key={lesson.lesson_id} id={`lesson-${lesson.lesson_id}`} variants={itemVariants}>
              <LessonCard
                lesson={lesson}
                onClick={() => handleLessonClick(lesson.lesson_id)}
                isGuest={isGuest}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
      <NativeModal
        title={moduleDetails.module_name}
        description={moduleDetails.module_description}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        coverImage={moduleDetails.module_cover_image ? buildFileUrl(moduleDetails.module_cover_image) : null}
      />
      <GuestBlockedModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title="Содержание урока доступно только ученикам"
        description="Зарегистрируйтесь, чтобы получить доступ к материалам урока"
      />
    </Page>
  );
};

export default ModulePage;
