import { createHashRouter, RouterProvider } from 'react-router-dom';
import { ResourceProvider } from './contexts/ResourceContext';
import { ScoreProvider } from './contexts/ScoreContext';
import AppShell from './components/layout/AppShell';
import LibraryPage from './components/library/LibraryPage';
import CurriculumPage from './components/curriculum/CurriculumPage';
import ReaderPage from './components/reader/ReaderPage';
import VideoPage from './components/video/VideoPage';
import QuizPage from './components/quiz/QuizPage';
import RewardsPage from './components/rewards/RewardsPage';
import DictionaryPage from './components/dictionary/DictionaryPage';
import { SpeechPracticePage } from './components/speech/SpeechPracticePage';
import { SpeechDebugPage } from './components/debug/SpeechDebugPage';

const router = createHashRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: '/', element: <LibraryPage /> },
        { path: '/curriculum', element: <CurriculumPage /> },
        { path: '/book/:bookId', element: <ReaderPage /> },
        { path: '/video/:videoId', element: <VideoPage /> },
        { path: '/quiz/:bookId', element: <QuizPage /> },
        { path: '/rewards', element: <RewardsPage /> },
        { path: '/dictionary', element: <DictionaryPage /> },
        { path: '/speech/:bookId', element: <SpeechPracticePage /> },
        { path: '/speech-debug', element: <SpeechDebugPage /> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default function App() {
  return (
    <ResourceProvider>
      <ScoreProvider>
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
      </ScoreProvider>
    </ResourceProvider>
  );
}