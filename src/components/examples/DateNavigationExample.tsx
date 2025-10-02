import React, { useState, useEffect } from 'react';
import { DateNavigation } from '../ui/date-navigation';
import { useDateNavigation } from '../../hooks/use-date-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export const DateNavigationExample: React.FC = () => {
  const [currentDateRange, setCurrentDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(now);
    to.setHours(10, 0, 0, 0);
    
    return { from, to };
  });

  const { dateRange, navigateDate, formatDateRange } = useDateNavigation(currentDateRange);

  const handleNavigate = (direction: 'left' | 'right' | 'up' | 'down') => {
    navigateDate(direction);
    
    // Update the current date range to match the navigation
    const { from, to } = dateRange;
    setCurrentDateRange({ from, to });
    
    // Here you would typically call your API to load data for the new date range
    console.log(`Navigating ${direction}:`, {
      from: from.toISOString(),
      to: to.toISOString()
    });
  };

  const formattedRange = formatDateRange();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Date Navigation Example</CardTitle>
        <p className="text-sm text-gray-600">
          Use the navigation buttons to move between dates. The range will automatically update.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Date Range Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              From: {formattedRange.from}
            </Badge>
            <Badge variant="outline" className="text-xs">
              To: {formattedRange.to}
            </Badge>
          </div>
        </div>

        {/* Date Navigation Component */}
        <div className="flex justify-center">
          <DateNavigation 
            onNavigate={handleNavigate}
          />
        </div>

        {/* Navigation Instructions */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">←</span>
              <span>Previous Day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">→</span>
              <span>Next Day</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">↑</span>
              <span>Previous Month</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">↓</span>
              <span>Next Month</span>
            </div>
          </div>
        </div>

        {/* Example Usage in Table Context */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Example: Table Data Context</h4>
          <p className="text-sm text-blue-700">
            When used in a table data page, clicking the navigation buttons will:
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• Update the date range in the date pickers</li>
            <li>• Automatically load new data for the selected period</li>
            <li>• Maintain the same time range (e.g., 00:00 - 10:00)</li>
            <li>• Provide smooth navigation between different time periods</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
