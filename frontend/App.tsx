import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import StudyPackDetail from './components/StudyPackDetail';
import { StudyPackProvider } from './context/StudyPackContext';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StudyPackProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/study-pack/:id" element={<StudyPackDetail />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </StudyPackProvider>
    </QueryClientProvider>
  );
}
