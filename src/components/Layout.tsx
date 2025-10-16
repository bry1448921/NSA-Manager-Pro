"use client";

import React from 'react';
import { Outlet } from 'react-router-dom';
import MainSidebar from '@/components/MainSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const Layout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <MainSidebar />
      <main className={`flex-1 p-4 ${isMobile ? 'mt-16' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;