import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileNav } from './Navigation';
import { Bars3Icon } from '@heroicons/react/24/outline';

export const Layout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar />
      <MobileNav isOpen={mobileNavOpen} setIsOpen={setMobileNavOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-gray-800 px-4 py-3">
            <h1 className="text-xl font-bold text-white">StockView</h1>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => setMobileNavOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none md:pl-64">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
