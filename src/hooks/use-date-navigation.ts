import { useState, useCallback } from 'react';

interface DateRange {
  from: Date;
  to: Date;
}

export const useDateNavigation = (initialDateRange?: DateRange) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialDateRange) {
      return initialDateRange;
    }
    
    // Default to current date with 10-hour range
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(now);
    to.setHours(10, 0, 0, 0);
    
    return { from, to };
  });

  const navigateDate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setDateRange(prevRange => {
      const newFrom = new Date(prevRange.from);
      const newTo = new Date(prevRange.to);
      
      switch (direction) {
        case 'left': // Previous day
          newFrom.setDate(newFrom.getDate() - 1);
          newTo.setDate(newTo.getDate() - 1);
          break;
          
        case 'right': // Next day
          newFrom.setDate(newFrom.getDate() + 1);
          newTo.setDate(newTo.getDate() + 1);
          break;
          
        case 'up': // Previous month
          newFrom.setMonth(newFrom.getMonth() - 1);
          newTo.setMonth(newTo.getMonth() - 1);
          break;
          
        case 'down': // Next month
          newFrom.setMonth(newFrom.getMonth() + 1);
          newTo.setMonth(newTo.getMonth() + 1);
          break;
      }
      
      return { from: newFrom, to: newTo };
    });
  }, []);

  const setDateRangeManually = useCallback((from: Date, to: Date) => {
    setDateRange({ from, to });
  }, []);

  const formatDateRange = useCallback(() => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    return {
      from: formatDate(dateRange.from),
      to: formatDate(dateRange.to)
    };
  }, [dateRange]);

  return {
    dateRange,
    navigateDate,
    setDateRangeManually,
    formatDateRange
  };
};
