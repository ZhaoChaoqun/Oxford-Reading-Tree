import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScore } from '../../contexts/ScoreContext';
import { useProgress } from '../../hooks/useProgress';
import curriculum from '../../data/curriculum.json';
import books from '../../data/books.json';
import videos from '../../data/videos.json';
import BookCard from './BookCard';
import VideoCard from './VideoCard';

const STAR_EMOJI = String.fromCodePoint(0x2b50);
const FIRE_EMOJI = String.fromCodePoint(0x1f525);

export default function LibraryPage() {
  const navigate = useNavigate();
  const { totalScore, streak } = useScore();
  const { isCompleted, getNextItem } = useProgress();

  const bookMap = useMemo(
    () => Object.fromEntries(books.books.map((b) => [b.id, b])),
    []
  );
  const videoMap = useMemo(
    () => Object.fromEntries(videos.videos.map((v) => [v.id, v])),
    []
  );
  const nextItem = getNextItem(curriculum.schedule);

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-orange-50 py-2 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-lg font-extrabold text-orange-600">
            {STAR_EMOJI} {totalScore} pts
          </div>
          {streak > 0 ? (
            <div className="text-sm font-bold text-orange-400">
              {FIRE_EMOJI} {streak} day streak
            </div>
          ) : null}
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-gray-700 mb-4">Learning Path</h2>

      <div className="grid grid-cols-2 gap-4">
        {curriculum.schedule.map((item) => {
          if (item.type === 'book') {
            const book = bookMap[item.id];
            if (!book) return null;
            return (
              <BookCard
                key={item.id}
                book={book}
                isCompleted={isCompleted(item.id)}
                isCurrent={nextItem?.id === item.id}
                onClick={() => navigate('/book/' + item.id)}
              />
            );
          }

          if (item.type === 'video') {
            const video = videoMap[item.id];
            if (!video) return null;
            return (
              <VideoCard
                key={item.id}
                video={video}
                isCompleted={isCompleted(item.id)}
                isCurrent={nextItem?.id === item.id}
                onClick={() => navigate('/video/' + item.id)}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}