'use client';

import LogoutButton from './LogoutButton';

export default function NavBar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Rental Property Schedule Automation
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Powered by Claude AI
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
