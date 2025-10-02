import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [view, setView] = React.useState<'days' | 'months' | 'years'>('days');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setView('days');
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setView('months');
  };

  const handleCaptionClick = () => {
    if (view === 'days') {
      setView('months');
    } else if (view === 'months') {
      setView('years');
    }
  };

  const handleBackClick = () => {
    if (view === 'years') {
      setView('months');
    } else if (view === 'months') {
      setView('days');
    }
  };

  const renderCaption = () => {
    if (view === 'days') {
      return (
        <div className="flex justify-center pt-1 relative items-center">
                     <Button
             variant="ghost"
             className="text-xs font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-none"
             onClick={handleCaptionClick}
           >
             {months[currentDate.getMonth()]} {currentDate.getFullYear()}
           </Button>
          <div className="absolute left-1">
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent rounded-none p-0 opacity-50 hover:opacity-100"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute right-1">
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent rounded-none p-0 opacity-50 hover:opacity-100"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    } else if (view === 'months') {
      return (
        <div className="flex justify-center pt-1 relative items-center">
                     <Button
             variant="ghost"
             className="text-xs font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-none"
             onClick={handleCaptionClick}
           >
             {currentDate.getFullYear()}
           </Button>
          <div className="absolute left-1">
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent rounded-none p-0 opacity-50 hover:opacity-100"
              onClick={handleBackClick}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-center pt-1 relative items-center">
          <div className="absolute left-1">
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent rounded-none p-0 opacity-50 hover:opacity-100"
              onClick={handleBackClick}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
  };



  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-3 gap-2 p-4">
        {months.map((month, index) => (
          <Button
            key={index}
            variant="ghost"
            className="h-12 text-xs hover:bg-accent hover:text-accent-foreground rounded-none"
            onClick={() => handleMonthSelect(index)}
          >
            {month}
          </Button>
        ))}
      </div>
    );
  };

  const renderYearView = () => {
    const years = generateYears();
    return (
      <div className="grid grid-cols-3 gap-2 p-4 max-h-64 overflow-y-auto">
        {years.map((year) => (
          <Button
            key={year}
            variant="ghost"
            className="h-12 text-xs hover:bg-accent hover:text-accent-foreground rounded-none"
            onClick={() => handleYearSelect(year)}
          >
            {year}
          </Button>
        ))}
      </div>
    );
  };

  if (view === 'months') {
    return (
      <div className={cn("p-3 rounded-none w-[280px]", className)}>
        <div className="space-y-4">
          {renderCaption()}
          {renderMonthView()}
        </div>
      </div>
    );
  }

  if (view === 'years') {
    return (
      <div className={cn("p-3 rounded-none w-[280px]", className)}>
        <div className="space-y-4">
          {renderCaption()}
          {renderYearView()}
        </div>
      </div>
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 rounded-none w-[280px]", className)}
      month={currentDate}
      onMonthChange={setCurrentDate}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent rounded-none p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 rounded-none",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-none w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2 rounded-none",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-none [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-none aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-none focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent opacity-50 text-accent-foreground rounded-none",
        day_outside:
          "day-outside text-muted-foreground opacity-50 rounded-none aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: () => renderCaption(),
        CaptionLabel: () => null,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
