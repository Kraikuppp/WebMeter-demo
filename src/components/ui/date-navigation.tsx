import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface DateNavigationProps {
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down') => void;
  className?: string;
  disabled?: boolean;
}

export const DateNavigation: React.FC<DateNavigationProps> = ({
  onNavigate,
  className,
  disabled = false
}) => {
  const handleClick = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!disabled) {
      onNavigate(direction);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      className
    )}>
      {/* Left Arrow - Previous Day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleClick('left')}
        disabled={disabled}
        className="w-5 h-5 p-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 rounded-none"
        title="Previous Day"
      >
        <ChevronLeft className="w-3 h-3" />
      </Button>

      {/* Up/Down Arrows - Previous/Next Month */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleClick('down')}
          disabled={disabled}
          className="w-4 h-3 p-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 rounded-none"
          title="Next Month"
        >
          <ChevronUp className="w-2.5 h-2.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleClick('up')}
          disabled={disabled}
          className="w-4 h-3 p-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 rounded-none"
          title="Previous Month"
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </Button>
      </div>

      {/* Right Arrow - Next Day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleClick('right')}
        disabled={disabled}
        className="w-5 h-5 p-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 rounded-none"
        title="Next Day"
      >
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
};
