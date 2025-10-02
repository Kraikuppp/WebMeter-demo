import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompactFiltersProps {
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  timeFrom?: string;
  timeTo?: string;
  onTimeFromChange: (time: string) => void;
  onTimeToChange: (time: string) => void;
  onLoad: () => void;
}

export function CompactFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  timeFrom = '00',
  timeTo = '24',
  onTimeFromChange,
  onTimeToChange,
  onLoad
}: CompactFiltersProps) {
  return (
    <div className="bg-muted/30 p-3 rounded-lg border">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 items-end">
        {/* Date From */}
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal h-8 text-xs",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateFrom ? format(dateFrom, "dd/MM") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={onDateFromChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time From */}
        <div className="space-y-1">
          <Label className="text-xs">Time</Label>
          <Select value={timeFrom} onValueChange={onTimeFromChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                  {i.toString().padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal h-8 text-xs",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateTo ? format(dateTo, "dd/MM") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={onDateToChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time To */}
        <div className="space-y-1">
          <Label className="text-xs">Time</Label>
          <Select value={timeTo} onValueChange={onTimeToChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                  {i.toString().padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select defaultValue="day">
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input 
            type="number" 
            defaultValue="20" 
            className="h-8 text-xs"
            min="1"
            max="31"
          />
        </div>

        {/* Load Button */}
        <div className="space-y-1">
          <Label className="text-xs">&nbsp;</Label>
          <Button size="sm" onClick={onLoad} className="h-8 w-full">
            <Search className="w-3 h-3 mr-1" />
            Load
          </Button>
        </div>
      </div>
    </div>
  );
}