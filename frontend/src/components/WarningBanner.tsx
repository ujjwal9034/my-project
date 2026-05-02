'use client';

import { useStore } from '@/store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function WarningBanner() {
  const { userInfo } = useStore();

  if (userInfo?.account_status === 'warned') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 p-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center text-yellow-800 dark:text-yellow-200 text-sm font-medium">
          <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
          <span>
            <strong>Account Warning:</strong> You have received {userInfo.warningCount} warning(s) from the administration. Please adhere to the platform guidelines to avoid account suspension.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
