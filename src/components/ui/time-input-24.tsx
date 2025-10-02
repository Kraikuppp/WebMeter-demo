import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TimeInput24Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const TimeInput24: React.FC<TimeInput24Props> = ({
  value,
  onChange,
  className,
  style,
  disabled = false
}) => {
  console.log('TimeInput24 rendered with value:', value); // Debug log
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(parseInt(value.split(':')[0]) || 0);
  const [selectedMinute, setSelectedMinute] = useState(parseInt(value.split(':')[1]) || 0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate hours array (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate minutes array (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Update internal state when value prop changes
  useEffect(() => {
    const [hour, minute] = value.split(':');
    setSelectedHour(parseInt(hour) || 0);
    setSelectedMinute(parseInt(minute) || 0);
  }, [value]);

  // Handle time selection
  const handleTimeSelect = (hour: number, minute: number) => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    const timeString = `${formattedHour}:${formattedMinute}`;
    onChange(timeString);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setIsOpen(false);
  };

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow typing numbers and colon
    if (/^[0-9:]*$/.test(inputValue)) {
      // Auto-format as user types
      let formatted = inputValue.replace(/[^0-9]/g, '');
      
      if (formatted.length >= 3) {
        formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
      } else if (formatted.length === 2) {
        formatted = formatted + ':';
      }
      
      // Validate and update
      if (formatted.length === 5) {
        const [hour, minute] = formatted.split(':');
        const h = parseInt(hour);
        const m = parseInt(minute);
        
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          onChange(formatted);
          setSelectedHour(h);
          setSelectedMinute(m);
        }
      } else if (formatted.length <= 5) {
        onChange(formatted);
      }
    }
  };

  // Handle click outside to close dropdown and position dropdown correctly
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        inputRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

         // Position dropdown correctly when opened
     if (isOpen && inputRef.current && dropdownRef.current) {
       const inputRect = inputRef.current.getBoundingClientRect();
       const dropdown = dropdownRef.current;
       
       // Calculate position
       const top = inputRect.bottom + window.scrollY;
       let left = inputRect.left + window.scrollX;
       
       // Check if dropdown would go off screen horizontally
       const dropdownWidth = 256; // w-64 = 16rem = 256px
       const windowWidth = window.innerWidth;
       const spaceRight = windowWidth - inputRect.left;
       
       if (spaceRight < dropdownWidth) {
         // Align to right edge if not enough space on the right
         left = windowWidth - dropdownWidth - 10; // 10px margin from edge
       }
       
       // Ensure dropdown doesn't go off the left side
       if (left < 10) {
         left = 10; // 10px margin from left edge
       }
       
       // Check if dropdown would go off screen vertically
       const dropdownHeight = 200; // max height
       const windowHeight = window.innerHeight;
       const spaceBelow = windowHeight - inputRect.bottom;
       
       if (spaceBelow < dropdownHeight) {
         // Position above input if not enough space below
         dropdown.style.top = `${inputRect.top + window.scrollY - dropdownHeight}px`;
       } else {
         dropdown.style.top = `${top}px`;
       }
       
       dropdown.style.left = `${left}px`;
       dropdown.style.position = 'fixed';
       dropdown.style.zIndex = '9999';
     }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        placeholder="HH:MM"
        disabled={disabled}
        className={cn(
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={style}
        maxLength={5}
        readOnly={false}
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 rounded-none shadow-lg w-64"
          style={{
            position: 'fixed',
            zIndex: 9999,
            maxHeight: '200px',
            overflow: 'hidden'
          }}
        >
          <div className="p-3">
        
            <div className="flex gap-2">
              {/* Hours Column */}
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-600 mb-1 text-center">Hour</div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleTimeSelect(hour, selectedMinute)}
                      className={cn(
                        "w-full px-2 py-1 text-xs text-left hover:bg-blue-50 transition-colors",
                        selectedHour === hour && "bg-blue-100 font-medium"
                      )}
                    >
                      {hour.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes Column */}
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-600 mb-1 text-center">Minute</div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeSelect(selectedHour, minute)}
                      className={cn(
                        "w-full px-2 py-1 text-xs text-left hover:bg-blue-50 transition-colors",
                        selectedMinute === minute && "bg-blue-100 font-medium"
                      )}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
