/**
 * 错题笔记模块入口
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

const ErrorNoteList = lazy(() => import('./ErrorNoteList'));
const ErrorNoteNew = lazy(() => import('./ErrorNoteNew'));
const ErrorNoteDetail = lazy(() => import('./ErrorNoteDetail'));

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: '#f5f5f5'
  }}>
    <Spin size="large" />
  </div>
);

export default function ErrorNoteModule() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route index element={<ErrorNoteList />} />
        <Route path="new" element={<ErrorNoteNew />} />
        <Route path=":id" element={<ErrorNoteDetail />} />
        <Route path="*" element={<Navigate to="/library/note" replace />} />
      </Routes>
    </Suspense>
  );
}
