import { useState } from 'react';
import { Search, Filter, HelpCircle } from 'lucide-react';
import ConnectionManager from '../components/ConnectionManager';
import ConnectionGuide from '../components/ConnectionGuide';

export default function Connections() {
  const [showGuide, setShowGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Database Connections</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Setup Guide
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showGuide ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <button
                onClick={() => setShowGuide(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Connections
              </button>
            </div>
            <ConnectionGuide />
          </div>
        ) : (
          <ConnectionManager searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}
