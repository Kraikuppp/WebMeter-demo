import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Toaster } from '@/components/ui/toaster';
import { ftConfigService } from '@/services/ftConfigService';
import { useLanguage } from '../context/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
import { CalendarIcon, Download, FileText, Search, Table, Rows, Columns, Printer, ArrowLeft, ArrowRight, BarChart3, Image as ImageIcon, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableColumnContext, columnOptions } from '../components/ui/sidebar-menu';
import { useMeterTree } from '@/context/MeterTreeContext';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { DateNavigation } from '@/components/ui/date-navigation';
import { PrintModal } from '@/components/ui/print-modal';
import { CalculationModal } from '@/components/ui/calculation-modal';
import { useDateNavigation } from '@/hooks/use-date-navigation';
import { apiClient } from '@/services/api';

interface ChargeDataRow {
  meterName: string;
  slaveId?: number | string; // เพิ่ม slaveId สำหรับการ filter log
  class: string;
  onPeakDemandW: number;
  offPeakDemandW: number;
  onPeakImportWh: number;
  offPeakImportWh: number;
  demandVar: number;
  demandVA: number;
  importKWh: number;
  powerFactorTotal: number;
  offPeakKWh: number;
  onPeakKWh: number;
  totalKWh: number;
  whCharge: number | null;
  onPeakWhCharge: number | null;
  offPeakWhCharge: number | null;
  demandCharge: number | null;
  onPeakDemandCharge: number | null;
  offPeakDemandCharge: number | null;
  serviceCharge: number | null;
  ft: number | null;
  surcharge: number | null;
  total: number | null;
  vat: number | null;
  grandTotal: number | null;
  // TOD fields สำหรับประเภท 4.1.1
  peakDemandW?: number; // Peak Demand (18:30-21:30)
  partialDemandW?: number; // Partial Demand (08:00-18:30)
  // offPeakDemandW already exists above
}

// Class options for the dropdown - 31 calculation types
const classOptions = [
  { value: "1.1.1", labelTH: "1.1.1 บ้านอยู่อาศัยไม่เกิน 150 หน่วย/เดือน (อัตราปกติ) ", labelEN: "1.1.1 Residential not over 150 kWh/month (Normal)", calculator: "1_residential_service" },
  { value: "1.1.2", labelTH: "1.1.2 บ้านอยู่อาศัยเกิน 150 หน่วย/เดือน (อัตราปกติ)", labelEN: "1.1.2 Residential over 150 kWh/month (Normal) (TOU)", calculator: "1_residential_service" },
  { value: "1.1.3.1", labelTH: "1.1.3.1 บ้านอยู่อาศัยแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "1.1.3.1 Residential 22-33 kV (TOU)", calculator: "1_residential_service" },
  { value: "1.1.3.2", labelTH: "1.1.3.2 บ้านอยู่อาศัยแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "1.1.3.2 Residential Below 22 kV (TOU)", calculator: "1_residential_service" },
  { value: "2.1.1", labelTH: "2.1.1 กิจการขนาดเล็กแรงดัน 22-33 kV (อัตราปกติ)", labelEN: "2.1.1 Small Business 22-33 kV (Normal)", calculator: "2_small_general_service" },
  { value: "2.1.2", labelTH: "2.1.2 กิจการขนาดเล็กแรงดันต่ำกว่า 22 kV (อัตราปกติ)", labelEN: "2.1.2 Small Business Below 22 kV (Normal)", calculator: "2_small_general_service" },
  { value: "2.2.1", labelTH: "2.2.1 กิจการขนาดเล็กแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "2.2.1 Small Business 22-33 kV (TOU)", calculator: "2_small_general_service" },
  { value: "2.2.2", labelTH: "2.2.2 กิจการขนาดเล็กแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "2.2.2 Small Business Below 22 kV (TOU)", calculator: "2_small_general_service" },
  { value: "3.1.1", labelTH: "3.1.1 กิจการขนาดกลางแรงดัน 69 kV ขึ้นไป (อัตราปกติ)", labelEN: "3.1.1 Medium Business 69 kV (Normal)", calculator: "3_medium_general_service" },
  { value: "3.1.2", labelTH: "3.1.2 กิจการขนาดกลางแรงดัน 22-33 kV (อัตราปกติ)", labelEN: "3.1.2 Medium Business 22-33 kV (Normal)", calculator: "3_medium_general_service" },
  { value: "3.1.3", labelTH: "3.1.3 กิจการขนาดกลางแรงดันต่ำกว่า 22 kV (อัตราปกติ)", labelEN: "3.1.3 Medium Business Below 22 kV (Normal)", calculator: "3_medium_general_service" },
  { value: "3.2.1", labelTH: "3.2.1 กิจการขนาดกลางแรงดัน 69 kV ขึ้นไป (อัตรา TOU)", labelEN: "3.2.1 Medium Business 69 kV (TOU)", calculator: "3_medium_general_service" },
  { value: "3.2.2", labelTH: "3.2.2 กิจการขนาดกลางแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "3.2.2 Medium Business 22-33 kV (TOU)", calculator: "3_medium_general_service" },
  { value: "3.2.3", labelTH: "3.2.3 กิจการขนาดกลางแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "3.2.3 Medium Business Below 22 kV (TOU)", calculator: "3_medium_general_service" },
  { value: "4.1.1", labelTH: "4.1.1 กิจการขนาดใหญ่แรงดัน 69 kV ขึ้นไป (อัตรา TOD)", labelEN: "4.1.1 Large Business 69 kV (TOD)", calculator: "4_large_general_service" },
  { value: "4.1.2", labelTH: "4.1.2 กิจการขนาดใหญ่แรงดัน 22-33 kV (อัตรา TOD)", labelEN: "4.1.2 Large Business 22-33 kV (TOD)", calculator: "4_large_general_service" },
  { value: "4.1.3", labelTH: "4.1.3 กิจการขนาดใหญ่แรงดันต่ำกว่า 22 kV (อัตรา TOD)", labelEN: "4.1.3 Large Business Below 22 kV (TOD)", calculator: "4_large_general_service" },
  { value: "4.2.1", labelTH: "4.2.1 กิจการขนาดใหญ่แรงดัน 69 kV ขึ้นไป (อัตรา TOU)", labelEN: "4.2.1 Large Business 69 kV (TOU)", calculator: "4_large_general_service" },
  { value: "4.2.2", labelTH: "4.2.2 กิจการขนาดใหญ่แรงดัน 22-33 kV (อัตรา TOU)", labelEN: "4.2.2 Large Business 22-33 kV (TOU)", calculator: "4_large_general_service" },
  { value: "4.2.3", labelTH: "4.2.3 กิจการขนาดใหญ่แรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "4.2.3 Large Business Below 22 kV (TOU)", calculator: "4_large_general_service" },
  { value: "5.1.1", labelTH: "5.1.1 กิจการเฉพาะอย่างแรงดัน 69 kV ขึ้นไป (อัตรา TOU)", labelEN: "5.1.1 Special Business 69 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "5.1.2", labelTH: "5.1.2 กิจการเฉพาะอย่างแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "5.1.2 Special Business 22-33 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "5.1.3", labelTH: "5.1.3 กิจการเฉพาะอย่างแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "5.1.3 Special Business Below 22 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "5.2.1", labelTH: "5.2.1 กิจการเฉพาะอย่างแรงดัน 69 kV ขึ้นไป (อัตรา TOU)", labelEN: "5.2.1 Special Business 69 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "5.2.2", labelTH: "5.2.2 กิจการเฉพาะอย่างแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "5.2.2 Special Business 22-33 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "5.2.3", labelTH: "5.2.3 กิจการเฉพาะอย่างแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "5.2.3 Special Business Below 22 kV (TOU)", calculator: "5_specific_business_service" },
  { value: "6.1.1", labelTH: "6.1.1 องค์การที่ไม่แสวงหากำไรแรงดัน 69 kV ขึ้นไป (อัตราปกติ)", labelEN: "6.1.1 Non-Profit Organization 69 kV (Normal)", calculator: "6_gov_nonprofit_org" },
  { value: "6.1.2", labelTH: "6.1.2 องค์การที่ไม่แสวงหากำไรแรงดัน 22-33 kV (อัตราปกติ)", labelEN: "6.1.2 Non-Profit Organization 22-33 kV (Normal)", calculator: "6_gov_nonprofit_org" },
  { value: "6.1.3", labelTH: "6.1.3 องค์การที่ไม่แสวงหากำไรแรงดันต่ำกว่า 22 kV (อัตราปกติ)", labelEN: "6.1.3 Non-Profit Organization Below 22 kV (Normal)", calculator: "6_gov_nonprofit_org" },
  { value: "6.2.1", labelTH: "6.2.1 องค์การที่ไม่แสวงหากำไรแรงดัน 69 kV ขึ้นไป (อัตรา TOU)", labelEN: "6.2.1 Non-Profit Organization 69 kV (TOU)", calculator: "6_gov_nonprofit_org" },
  { value: "6.2.2", labelTH: "6.2.2 องค์การที่ไม่แสวงหากำไรแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "6.2.2 Non-Profit Organization 22-33 kV (TOU)", calculator: "6_gov_nonprofit_org" },
  { value: "6.2.3", labelTH: "6.2.3 องค์การที่ไม่แสวงหากำไรแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "6.2.3 Non-Profit Organization Below 22 kV (TOU)", calculator: "6_gov_nonprofit_org" },
  { value: "7.1", labelTH: "7.1 สูบน้ำเพื่อการเกษตร (อัตราปกติ)", labelEN: "7.1 Agricultural Pumping (Normal)", calculator: "7_water_pumping_agricultural" },
  { value: "7.2.1", labelTH: "7.2.1 สูบน้ำเพื่อการเกษตรแรงดัน 22-33 kV (อัตรา TOU)", labelEN: "7.2.1 Agricultural Pumping 22-33 kV (TOU)", calculator: "7_water_pumping_agricultural" },
  { value: "7.2.2", labelTH: "7.2.2 สูบน้ำเพื่อการเกษตรแรงดันต่ำกว่า 22 kV (อัตรา TOU)", labelEN: "7.2.2 Agricultural Pumping Below 22 kV (TOU)", calculator: "7_water_pumping_agricultural" },
  { value: "8", labelTH: "8 ไฟฟ้าชั่วคราว", labelEN: "8 Temporary Power", calculator: "8_temporary_tariff" }
];

// TOU Rates Configuration สำหรับแต่ละ class
const touRatesConfig = {
  // Residential Classes
  "1.1.1": {
    name: "บ้านอยู่อาศัยไม่เกิน 150 หน่วย/เดือน (อัตราปกติ)",
    onPeakRate: 4.2218, // บาท/kWh (ใช้อัตราเฉลี่ย)
    offPeakRate: 2.3218, // บาท/kWh (ใช้อัตราเฉลี่ย)
    serviceCharge: 8.19, // บาท/เดือน
    demandCharge: 0, // บาท/kW (ไม่มีค่า demand สำหรับ residential)
    currency: "บาท"
  },
  "1.1.2": {
    name: "บ้านอยู่อาศัยเกิน 150 หน่วย/เดือน (อัตราปกติ)",
    onPeakRate: 4.4218, // บาท/kWh (ใช้อัตราเฉลี่ย)
    offPeakRate: 2.5218, // บาท/kWh (ใช้อัตราเฉลี่ย)
    serviceCharge: 24.62, // บาท/เดือน
    demandCharge: 0, // บาท/kW (ไม่มีค่า demand สำหรับ residential)
    currency: "บาท"
  },
  "1.1.3.1": {
    name: "บ้านอยู่อาศัยแรงดัน 22-33 kV (อัตรา TOU)",
    onPeakRate: 5.1135, // บาท/kWh
    offPeakRate: 2.6037, // บาท/kWh
    serviceCharge: 312.24, // บาท/เดือน
    demandCharge: 0, // บาท/kW (ไม่มีค่า demand สำหรับ residential)
    currency: "บาท"
  },
  "1.1.3.2": {
    name: "บ้านอยู่อาศัยแรงดันต่ำกว่า 22 kV (อัตรา TOU)",
    onPeakRate: 5.7982, // บาท/kWh
    offPeakRate: 2.6369, // บาท/kWh
    serviceCharge: 24.62, // บาท/เดือน
    demandCharge: 0, // บาท/kW (ไม่มีค่า demand สำหรับ residential)
    currency: "บาท"
  },
  // Small Business Classes
  "2.1.1": {
    name: "กิจการขนาดเล็กแรงดัน 22-33 kV (อัตราปกติ)",
    onPeakRate: 3.9086, // บาท/kWh
    offPeakRate: 3.9086, // บาท/kWh (เหมือนกัน สำหรับอัตราปกติ)
    serviceCharge: 312.24, // บาท/เดือน
    demandCharge: 0, // บาท/kW
    currency: "บาท"
  },
  "2.1.2": {
    name: "กิจการขนาดเล็กแรงดันต่ำกว่า 22 kV (อัตราปกติ)",
    onPeakRate: 4.1838, // บาท/kWh
    offPeakRate: 4.1838, // บาท/kWh (เหมือนกัน สำหรับอัตราปกติ)
    serviceCharge: 38.22, // บาท/เดือน
    demandCharge: 0, // บาท/kW
    currency: "บาท"
  },
  "2.2.1": {
    name: "กิจการขนาดเล็กแรงดัน 22-33 kV (อัตรา TOU)",
    onPeakRate: 4.5086, // บาท/kWh
    offPeakRate: 2.9086, // บาท/kWh
    serviceCharge: 312.24, // บาท/เดือน
    demandCharge: 0, // บาท/kW
    currency: "บาท"
  },
  "2.2.2": {
    name: "กิจการขนาดเล็กแรงดันต่ำกว่า 22 kV (อัตรา TOU)",
    onPeakRate: 4.7838, // บาท/kWh
    offPeakRate: 3.1838, // บาท/kWh
    serviceCharge: 38.22, // บาท/เดือน
    demandCharge: 0, // บาท/kW
    currency: "บาท"
  }
  // สามารถเพิ่ม rates สำหรับ class อื่นๆ ได้ที่นี่
};

// ฟังก์ชันสำหรับดึง TOU rates ตาม class
const getTouRates = (classValue: string) => {
  console.log(`🔍 getTouRates called with: "${classValue}"`);
  console.log(`🔍 Available classes in config:`, Object.keys(touRatesConfig));
  console.log(`🔍 Config for ${classValue}:`, touRatesConfig[classValue]);
  
  // ถ้าไม่มี config สำหรับ class นี้ ใช้ default rates
  if (!touRatesConfig[classValue]) {
    console.log(`⚠️ No TOU rates found for class "${classValue}", using default rates`);
    return {
      name: `${classValue} (Default Rates)`,
      onPeakRate: 4.0, // บาท/kWh (ค่าเริ่มต้น)
      offPeakRate: 2.5, // บาท/kWh (ค่าเริ่มต้น)
      serviceCharge: 20.0, // บาท/เดือน (ค่าเริ่มต้น)
      demandCharge: 0, // บาท/kW
      currency: "บาท"
    };
  }
  
  return touRatesConfig[classValue];
};

// Empty sample data - will be populated from database
const sampleData: ChargeDataRow[] = [];

// ฟังก์ชันสำหรับตรวจสอบว่าเป็นวันหยุดหรือไม่
const isHoliday = (date: Date, holidays: any[]): { isHoliday: boolean, holidayName?: string } => {
  // ตรวจสอบว่า date เป็น Date object ที่ถูกต้องหรือไม่
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('⚠️ Invalid date passed to isHoliday:', date);
    return { isHoliday: false };
  }
  
  // ตรวจสอบว่ามี holidays array หรือไม่
  if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
    return { isHoliday: false };
  }
  
  try {
    const dateStr = date.toISOString().split('T')[0];
    const holiday = holidays.find(h => {
      try {
        if (!h || !h.date) return false;
        const holidayDate = new Date(h.date).toISOString().split('T')[0];
        return holidayDate === dateStr;
      } catch (error) {
        console.warn('⚠️ Error processing holiday:', h, error);
        return false;
      }
    });
    
    return {
      isHoliday: !!holiday,
      holidayName: holiday?.name_holiday
    };
  } catch (error) {
    console.error('❌ Error in isHoliday function:', error);
    return { isHoliday: false };
  }
};

// ฟังก์ชันสำหรับตรวจสอบช่วงเวลา TOD (Time of Day) สำหรับประเภท 4.1.1
const getTODPeriodInfo = (dateTime: Date) => {
  // ตรวจสอบว่า dateTime เป็น Date object ที่ถูกต้องหรือไม่
  if (!dateTime || !(dateTime instanceof Date) || isNaN(dateTime.getTime())) {
    console.error('❌ Invalid dateTime passed to getTODPeriodInfo:', dateTime);
    return {
      isPeak: false,
      isPartial: false,
      isOffPeak: true,
      timeStr: '--:--',
      reason: 'Invalid date/time data'
    };
  }
  
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // TOD periods สำหรับ 4.1.1:
  // Peak: 18:30 - 21:30 น. ของทุกวัน
  // Partial: 08:00 - 18:30 น. ของทุกวัน (ค่าความต้องการพลังไฟฟ้า คิดเฉพาะส่วนที่เกิน Peak)
  // Off Peak: 21:30 - 08:00 น. ของทุกวัน
  
  const peakStart = 18 * 60 + 30;   // 18:30 = 1110 minutes
  const peakEnd = 21 * 60 + 30;     // 21:30 = 1290 minutes
  const partialStart = 8 * 60;      // 08:00 = 480 minutes
  const partialEnd = 18 * 60 + 30;  // 18:30 = 1110 minutes
  
  let isPeak = false;
  let isPartial = false;
  let isOffPeak = false;
  let reason = '';
  
  // ตรวจสอบตามลำดับความสำคัช: Peak > Partial > Off Peak
  if (timeInMinutes >= peakStart && timeInMinutes < peakEnd) {
    // Peak period: 18:30 - 21:30 (ความสำคัญสูงสุด)
    isPeak = true;
    reason = `เวลา ${timeStr} น. อยู่ในช่วง Peak (18:30-21:30 น.)`;
  } else if (timeInMinutes >= partialStart && timeInMinutes < peakStart) {
    // Partial period: 08:00 - 18:30 (ไม่รวมช่วง Peak)
    isPartial = true;
    reason = `เวลา ${timeStr} น. อยู่ในช่วง Partial (08:00-18:30 น.)`;
  } else {
    // Off Peak period: 21:30 - 08:00 (รวมข้ามวัน)
    isOffPeak = true;
    if (timeInMinutes >= peakEnd || timeInMinutes < partialStart) {
      reason = `เวลา ${timeStr} น. อยู่ในช่วง Off Peak (21:30-08:00 น.)`;
    } else {
      // กรณีพิเศษ (ควรจะไม่เกิดขึ้น)
      reason = `เวลา ${timeStr} น. อยู่ในช่วง Off Peak (นอกช่วงกำหนด)`;
    }
  }
  
  return {
    isPeak,
    isPartial,
    isOffPeak,
    timeStr,
    reason
  };
};

// ฟังก์ชันสำหรับตรวจสอบช่วงเวลา Peak/Off Peak (TOU)
const getPeakPeriodInfo = (dateTime: Date, holidays: any[] = []) => {
  // ตรวจสอบว่า dateTime เป็น Date object ที่ถูกต้องหรือไม่
  if (!dateTime || !(dateTime instanceof Date) || isNaN(dateTime.getTime())) {
    console.error('❌ Invalid dateTime passed to getPeakPeriodInfo:', dateTime);
    return {
      isPeak: false,
      isOffPeak: true,
      dayOfWeek: 0,
      dayNameTH: 'ไม่ทราบ',
      timeStr: '--:--',
      isWeekday: false,
      isWeekend: true,
      isHoliday: false,
      holidayName: undefined,
      reason: 'Invalid date/time data'
    };
  }
  
  const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // ตรวจสอบวันหยุด
  const holidayInfo = isHoliday(dateTime, holidays);
  
  // กำหนดชื่อวัน
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const dayNameTH = dayNames[dayOfWeek];
  
  // กำหนดเวลา
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // ตรวจสอบว่าเป็นวันธรรมดา (จันทร์-ศุกร์) หรือไม่
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let isPeak = false;
  let reason = '';
  
  if (isWeekday && !holidayInfo.isHoliday) {
    // วันจันทร์-ศุกร์ที่ไม่ใช่วันหยุด
    // Peak: 09:00-22:00 น.
    const peakStart = 9 * 60; // 09:00 = 540 minutes
    const peakEnd = 22 * 60;   // 22:00 = 1320 minutes
    
    if (timeInMinutes >= peakStart && timeInMinutes < peakEnd) {
      isPeak = true;
      reason = `วันธรรมดา (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Peak (09:00-22:00 น.)`;
    } else {
      isPeak = false;
      if (timeInMinutes < peakStart) {
        reason = `วันธรรมดา (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Off Peak (00:00-09:00 น.)`;
      } else {
        reason = `วันธรรมดา (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Off Peak (22:00-24:00 น.)`;
      }
    }
  } else if (holidayInfo.isHoliday && isWeekday) {
    // วันพืชมงคลที่ตรงกับวันจันทร์-ศุกร์
    const peakStart = 9 * 60; // 09:00 = 540 minutes
    const peakEnd = 22 * 60;   // 22:00 = 1320 minutes
    
    if (timeInMinutes >= peakStart && timeInMinutes < peakEnd) {
      isPeak = true;
      reason = `วันหยุด "${holidayInfo.holidayName}" (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Peak (09:00-22:00 น.)`;
    } else {
      isPeak = false;
      if (timeInMinutes < peakStart) {
        reason = `วันหยุด "${holidayInfo.holidayName}" (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Off Peak (00:00-09:00 น.)`;
      } else {
        reason = `วันหยุด "${holidayInfo.holidayName}" (${dayNameTH}) เวลา ${timeStr} น. อยู่ในช่วง Off Peak (22:00-24:00 น.)`;
      }
    }
  } else {
    // วันเสาร์-อาทิตย์ หรือ วันหยุดราชการอื่นๆ
    isPeak = false;
    if (holidayInfo.isHoliday) {
      reason = `วันหยุด "${holidayInfo.holidayName}" (${dayNameTH}) ตลอดทั้งวัน = Off Peak (00:00-24:00 น.)`;
    } else {
      reason = `วันหยุดสุดสัปดาห์ (${dayNameTH}) ตลอดทั้งวัน = Off Peak (00:00-24:00 น.)`;
    }
  }
  
  // เก็บ log สำหรับแสดงเป็น range (ไม่แสดงทุก record)
  // จะแสดงใน separatePeakOffPeakData แทน
  
  return {
    isPeak,
    isOffPeak: !isPeak,
    dayOfWeek,
    dayNameTH,
    timeStr,
    isWeekday,
    isWeekend,
    isHoliday: holidayInfo.isHoliday,
    holidayName: holidayInfo.holidayName,
    reason
  };
};

// ฟังก์ชันแสดง Peak/Off Peak analysis สำหรับช่วงวันที่ที่เลือก (แม้ไม่มีข้อมูล)
const showPeakOffPeakAnalysis = (dateFrom: Date, dateTo: Date, holidays: any[] = []) => {
  console.log(`📊 === PEAK/OFF PEAK ANALYSIS ===`);
  console.log(`📅 ช่วงวันที่: ${dateFrom.toLocaleDateString('th-TH')} - ${dateTo.toLocaleDateString('th-TH')}`);
  console.log(`🎉 วันหยุดในระบบ: ${holidays.length} วัน`);
  
  // สร้างรายการวันในช่วงที่เลือก
  const currentDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  let totalDays = 0;
  let workingDays = 0;
  let holidayDays = 0;
  
  while (currentDate <= endDate) {
    const periodInfo = getPeakPeriodInfo(currentDate, holidays);
    const dateStr = currentDate.toLocaleDateString('th-TH');
    const holidayInfo = periodInfo.isHoliday ? ` 🎉 ${periodInfo.holidayName}` : '';
    
    console.log(`📅 ${dateStr} (${periodInfo.dayNameTH})${holidayInfo}`);
    
    if (periodInfo.isHoliday || periodInfo.dayNameTH === 'เสาร์' || periodInfo.dayNameTH === 'อาทิตย์') {
      // วันหยุด = Off Peak ตลอดวัน
      console.log(`   🟢 Off Peak: ตลอดทั้งวัน (00:00-24:00 น.)`);
      holidayDays++;
    } else {
      // วันทำการ = มี Peak และ Off Peak
      console.log(`   🔴 Peak: 09:00-22:00 น. (13 ชั่วโมง)`);
      console.log(`   🟢 Off Peak: 22:00-09:00 น. (11 ชั่วโมง)`);
      workingDays++;
    }
    
    totalDays++;
    
    // เพิ่มวันถัดไป
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`📊 สรุป: รวม ${totalDays} วัน (วันทำการ ${workingDays} วัน, วันหยุด ${holidayDays} วัน)`);
  console.log(`⚡ Peak Hours: ${workingDays * 13} ชั่วโมง`);
  console.log(`🟢 Off Peak Hours: ${(workingDays * 11) + (holidayDays * 24)} ชั่วโมง`);
  console.log(`================================`);
};

// ฟังก์ชันสำหรับแยกข้อมูลเป็น Peak และ Off Peak
const separatePeakOffPeakData = (records: any[], holidays: any[] = [], dateRange?: { from: Date, to: Date }) => {
  // เริ่มแยกข้อมูล Peak/Off Peak (ปิด log รายละเอียด)
  
  // ตรวจสอบ input parameters
  if (!records || !Array.isArray(records)) {
    console.error('❌ Invalid records array passed to separatePeakOffPeakData');
    return {
      peakRecords: [],
      offPeakRecords: [],
      peakDemandW: 0,
      offPeakDemandW: 0,
      peakImportKWh: 0,
      offPeakImportKWh: 0,
      totalPeakRecords: 0,
      totalOffPeakRecords: 0
    };
  }
  
  if (records.length === 0) {
    return {
      peakRecords: [],
      offPeakRecords: [],
      peakDemandW: 0,
      offPeakDemandW: 0,
      peakImportKWh: 0,
      offPeakImportKWh: 0,
      totalPeakRecords: 0,
      totalOffPeakRecords: 0
    };
  }
  
  let peakRecords: any[] = [];
  let offPeakRecords: any[] = [];
  let peakDemandW = 0;
  let offPeakDemandW = 0;
  let maxDemandVar = 0; // ใช้ค่าสูงสุดโดยรวม ไม่แยก Peak/Off Peak
  let peakImportKWh = 0;
  let offPeakImportKWh = 0;
  
  // เก็บค่าแรกและสุดท้ายสำหรับคำนวณผลต่าง kWh ในช่วง Peak
  let peakFirstKWh: number | null = null;
  let peakLastKWh: number | null = null;
  let offPeakFirstKWh: number | null = null;
  let offPeakLastKWh: number | null = null;
  
  // เก็บข้อมูลสำหรับแสดง range แยกตามวัน
  const dailyData = new Map<string, {
    date: string,
    isHoliday: boolean,
    holidayName?: string,
    dayName: string,
    peakPeriods: { start: Date, end: Date }[],
    offPeakPeriods: { start: Date, end: Date }[],
    peakRecords: number,
    offPeakRecords: number
  }>();
  
  records.forEach((record, index) => {
    // ตรวจสอบและแก้ไขการ parse วันที่
    let dateTime: Date;
    try {
      // ลองใช้ field ต่างๆ ที่อาจมีข้อมูลวันที่
      if (record.datetime) {
        dateTime = new Date(record.datetime);
      } else if (record.reading_timestamp) {
        dateTime = new Date(record.reading_timestamp);
      } else if (record.time) {
        dateTime = new Date(record.time);
      } else {
        return; // Skip this record
      }
      
      // ตรวจสอบว่า Date object ถูกต้องหรือไม่
      if (isNaN(dateTime.getTime())) {
        return; // Skip this record
      }
    } catch (error) {
      return; // Skip this record
    }
    
    const demandW = parseFloat(record['Demand W']) || 0;
    const importKWh = parseFloat(record['Import kWh']) || 0;
    const demandVar = parseFloat(record['Demand Var']) || 0;
    
    // ตรวจสอบช่วงเวลา
    const periodInfo = getPeakPeriodInfo(dateTime, holidays);
    
    // เก็บข้อมูลแยกตามวัน
    const dateStr = dateTime.toLocaleDateString('th-TH');
    const dateKey = dateTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        date: dateStr,
        isHoliday: periodInfo.isHoliday,
        holidayName: periodInfo.holidayName,
        dayName: periodInfo.dayNameTH,
        peakPeriods: [],
        offPeakPeriods: [],
        peakRecords: 0,
        offPeakRecords: 0
      });
    }
    
    const dayData = dailyData.get(dateKey)!;
    
    // Demand Var: ใช้ค่าสูงสุดโดยรวมทั้งช่วงเวลา (ไม่แยก Peak/Off Peak)
    maxDemandVar = Math.max(maxDemandVar, demandVar);
    
    if (periodInfo.isPeak) {
      peakRecords.push(record);
      // DmW: ใช้ค่าสูงสุด (เหมือนเดิม)
      peakDemandW = Math.max(peakDemandW, demandW);
      
      // kWh: เก็บค่าแรกและสุดท้ายสำหรับคำนวณผลต่าง
      if (peakFirstKWh === null) {
        peakFirstKWh = importKWh;
      }
      peakLastKWh = importKWh;
      
      dayData.peakRecords++;
    } else {
      offPeakRecords.push(record);
      // DmW: ใช้ค่าสูงสุด (เหมือนเดิม)
      offPeakDemandW = Math.max(offPeakDemandW, demandW);
      
      // kWh: เก็บค่าแรกและสุดท้ายสำหรับคำนวณผลต่าง
      if (offPeakFirstKWh === null) {
        offPeakFirstKWh = importKWh;
      }
      offPeakLastKWh = importKWh;
      
      dayData.offPeakRecords++;
    }
    
  });
  
  // แสดง summary แยกตามวัน
  if (dailyData.size > 0) {
    console.log(`📊 === PEAK/OFF PEAK SUMMARY (${dailyData.size} วัน) ===`);
    
    const sortedDays = Array.from(dailyData.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    sortedDays.forEach(([dateKey, dayData]) => {
      const holidayInfo = dayData.isHoliday ? ` 🎉 ${dayData.holidayName}` : '';
      console.log(`📅 ${dayData.date} (${dayData.dayName})${holidayInfo}`);
      
      if (dayData.isHoliday || dayData.dayName === 'เสาร์' || dayData.dayName === 'อาทิตย์') {
        // วันหยุด = Off Peak ตลอดวัน
        console.log(`   🟢 Off Peak: ตลอดทั้งวัน (${dayData.offPeakRecords} records)`);
      } else {
        // วันทำการ = มี Peak และ Off Peak
        if (dayData.peakRecords > 0) {
          console.log(`   🔴 Peak: 09:00-22:00 น. (${dayData.peakRecords} records)`);
        }
        if (dayData.offPeakRecords > 0) {
          console.log(`   🟢 Off Peak: 22:00-09:00 น. (${dayData.offPeakRecords} records)`);
        }
      }
    });
    
    console.log(`📊 รวมทั้งหมด: Peak ${peakRecords.length} records, Off Peak ${offPeakRecords.length} records`);
    console.log(`================================`);
  } else if (dateRange) {
    // ไม่มีข้อมูล แต่แสดง log ตามช่วงวันที่ที่เลือก
    console.log(`📊 === PEAK/OFF PEAK SUMMARY (ไม่มีข้อมูล) ===`);
    console.log(`⚠️ ไม่มีข้อมูลในช่วงวันที่ที่เลือก แต่แสดงเงื่อนไข Peak/Off Peak:`);
    
    // สร้างรายการวันในช่วงที่เลือก
    const currentDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    
    while (currentDate <= endDate) {
      const periodInfo = getPeakPeriodInfo(currentDate, holidays);
      const dateStr = currentDate.toLocaleDateString('th-TH');
      const holidayInfo = periodInfo.isHoliday ? ` 🎉 ${periodInfo.holidayName}` : '';
      
      console.log(`📅 ${dateStr} (${periodInfo.dayNameTH})${holidayInfo}`);
      
      if (periodInfo.isHoliday || periodInfo.dayNameTH === 'เสาร์' || periodInfo.dayNameTH === 'อาทิตย์') {
        // วันหยุด = Off Peak ตลอดวัน
        console.log(`   🟢 Off Peak: ตลอดทั้งวัน (0 records - ไม่มีข้อมูล)`);
      } else {
        // วันทำการ = มี Peak และ Off Peak
        console.log(`   🔴 Peak: 09:00-22:00 น. (0 records - ไม่มีข้อมูล)`);
        console.log(`   🟢 Off Peak: 22:00-09:00 น. (0 records - ไม่มีข้อมูล)`);
      }
      
      // เพิ่มวันถัดไป
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`📊 รวมทั้งหมด: Peak 0 records, Off Peak 0 records`);
    console.log(`================================`);
  } else {
    console.log(`📊 === PEAK/OFF PEAK SUMMARY ===`);
    console.log(`⚠️ ไม่มีข้อมูลในช่วงวันที่ที่เลือก`);
    console.log(`📊 รวมทั้งหมด: Peak 0 records, Off Peak 0 records`);
    console.log(`================================`);
  }
  
  // คำนวณผลต่าง kWh (หน่วยสุดท้าย - หน่วยแรก) สำหรับ TOU
  peakImportKWh = (peakLastKWh !== null && peakFirstKWh !== null) 
    ? Math.max(0, peakLastKWh - peakFirstKWh) 
    : 0;
    
  offPeakImportKWh = (offPeakLastKWh !== null && offPeakFirstKWh !== null) 
    ? Math.max(0, offPeakLastKWh - offPeakFirstKWh) 
    : 0;

  console.log(`📊 === TOU CALCULATION RESULTS ===`);
  console.log(`🔴 Peak - DmW: ${peakDemandW.toFixed(2)} (สูงสุด), kWh: ${peakImportKWh.toFixed(2)} (ผลต่าง: ${peakLastKWh} - ${peakFirstKWh})`);
  console.log(`🟢 Off Peak - DmW: ${offPeakDemandW.toFixed(2)} (สูงสุด), kWh: ${offPeakImportKWh.toFixed(2)} (ผลต่าง: ${offPeakLastKWh} - ${offPeakFirstKWh})`);
  console.log(`⚡ Max Demand Var: ${maxDemandVar.toFixed(2)} (สูงสุดโดยรวมทั้งช่วงเวลา)`);
  console.log(`================================`);

  return {
    peakRecords,
    offPeakRecords,
    peakDemandW,
    offPeakDemandW,
    maxDemandVar, // ค่าสูงสุดโดยรวมทั้งช่วงเวลา
    peakImportKWh,
    offPeakImportKWh,
    totalPeakRecords: peakRecords.length,
    totalOffPeakRecords: offPeakRecords.length
  };
};

// ฟังก์ชันสำหรับแยกข้อมูลเป็น TOD periods สำหรับประเภท 4.1.1
const separateTODData = (records: any[]) => {
  console.log(`🔍 === SEPARATETODDATA FUNCTION CALLED ===`);
  console.log(`📊 Input records:`, {
    isArray: Array.isArray(records),
    length: records ? records.length : 'null/undefined',
    type: typeof records
  });
  
  // ตรวจสอบ input parameters
  if (!records || !Array.isArray(records)) {
    console.error('❌ Invalid records array passed to separateTODData');
    console.error('❌ Records value:', records);
    return {
      peakRecords: [],
      partialRecords: [],
      offPeakRecords: [],
      peakDemandW: 0,
      partialDemandW: 0,
      offPeakDemandW: 0,
      maxDemandVar: 0,
      totalKWh: 0,
      totalPeakRecords: 0,
      totalPartialRecords: 0,
      totalOffPeakRecords: 0
    };
  }
  
  if (records.length === 0) {
    return {
      peakRecords: [],
      partialRecords: [],
      offPeakRecords: [],
      peakDemandW: 0,
      partialDemandW: 0,
      offPeakDemandW: 0,
      maxDemandVar: 0,
      totalKWh: 0,
      totalPeakRecords: 0,
      totalPartialRecords: 0,
      totalOffPeakRecords: 0
    };
  }
  
  let peakRecords: any[] = [];
  let partialRecords: any[] = [];
  let offPeakRecords: any[] = [];
  let peakDemandW = 0;
  let partialDemandW = 0;
  let offPeakDemandW = 0;
  let maxDemandVar = 0;
  
  // คำนวณ total kWh จากผลต่าง (หน่วยสุดท้าย - หน่วยแรก)
  let firstKWh: number | null = null;
  let lastKWh: number | null = null;
  
  console.log(`🕐 === TOD DATA SEPARATION FOR 4.1.1 ===`);
  console.log(`📊 Processing ${records.length} records...`);
  console.log(`🕰️ TOD Periods Definition:`);
  console.log(`   🔴 Peak: 18:30-21:30 น. (ความต้องการสูงสุด)`);
  console.log(`   🟡 Partial: 08:00-18:30 น. (ไม่รวมช่วง Peak)`);
  console.log(`   🟢 Off Peak: 21:30-08:00 น. (เวลาอื่นๆ)`);
  console.log(``);
  
  // ตัวนับสำหรับตรวจสอบการแยก periods
  let periodCounts = { peak: 0, partial: 0, offPeak: 0 };
  let sampleTimes = { peak: [], partial: [], offPeak: [] }; // เก็บตัวอย่างเวลา
  let timeRangeAnalysis = { earliest: null, latest: null, totalHours: 0 }; // วิเคราะห์ช่วงเวลาข้อมูล
  
  // ตรวจสอบช่วงเวลาข้อมูลก่อนแยก TOD
  if (records.length > 0) {
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];
    
    let firstTime, lastTime;
    try {
      // ใช้ logic เดียวกันกับการ parse ใน forEach
      if (firstRecord.datetime) {
        firstTime = new Date(firstRecord.datetime);
      } else if (firstRecord.timestamp) {
        firstTime = new Date(firstRecord.timestamp);
      } else if (firstRecord.reading_timestamp) {
        firstTime = new Date(firstRecord.reading_timestamp);
      } else if (firstRecord.time) {
        firstTime = new Date(firstRecord.time);
      } else if (firstRecord.date && firstRecord.time) {
        firstTime = new Date(`${firstRecord.date} ${firstRecord.time}`);
      }
      
      if (lastRecord.datetime) {
        lastTime = new Date(lastRecord.datetime);
      } else if (lastRecord.timestamp) {
        lastTime = new Date(lastRecord.timestamp);
      } else if (lastRecord.reading_timestamp) {
        lastTime = new Date(lastRecord.reading_timestamp);
      } else if (lastRecord.time) {
        lastTime = new Date(lastRecord.time);
      } else if (lastRecord.date && lastRecord.time) {
        lastTime = new Date(`${lastRecord.date} ${lastRecord.time}`);
      }
      
      if (firstTime && lastTime && !isNaN(firstTime.getTime()) && !isNaN(lastTime.getTime())) {
        timeRangeAnalysis.earliest = firstTime.toLocaleString('th-TH');
        timeRangeAnalysis.latest = lastTime.toLocaleString('th-TH');
        timeRangeAnalysis.totalHours = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60) * 100) / 100;
        
        console.log(`🕰️ === DATA TIME RANGE ANALYSIS ===`);
        console.log(`🕑 เวลาแรก: ${timeRangeAnalysis.earliest}`);
        console.log(`🕜 เวลาสุดท้าย: ${timeRangeAnalysis.latest}`);
        console.log(`⏱️ รวมชั่วโมง: ${timeRangeAnalysis.totalHours} ชั่วโมง`);
        console.log(`📅 จำนวน records: ${records.length} รายการ`);
        console.log(``);
      } else {
        console.warn(`⚠️ Cannot parse time range from records`);
      }
    } catch (error) {
      console.warn(`⚠️ Error analyzing time range:`, error);
    }
  }
  
  records.forEach((record, index) => {
    // ตรวจสอบและแก้ไขการ parse วันที่
    let dateTime: Date;
    try {
      if (record.datetime) {
        dateTime = new Date(record.datetime);
      } else if (record.timestamp) {
        dateTime = new Date(record.timestamp);
      } else if (record.reading_timestamp) {
        dateTime = new Date(record.reading_timestamp);
      } else if (record.time) {
        dateTime = new Date(record.time);
      } else if (record.date && record.time) {
        dateTime = new Date(`${record.date} ${record.time}`);
      } else {
        console.warn(`⚠️ No valid datetime field found in record ${index}:`, record);
        return; // ข้าม record นี้
      }
      
      // ตรวจสอบว่า date parsing สำเร็จหรือไม่
      if (isNaN(dateTime.getTime())) {
        console.warn(`⚠️ Invalid date parsed for record ${index}:`, {
          datetime: record.datetime,
          timestamp: record.timestamp,
          reading_timestamp: record.reading_timestamp,
          time: record.time,
          parsedDate: dateTime
        });
        return; // ข้าม record นี้
      }
    } catch (error) {
      console.warn(`⚠️ Error parsing datetime for record ${index}:`, error, record);
      return; // ข้าม record นี้
    }
    
    // ดึงค่าข้อมูล
    const demandW = parseFloat(record['Demand W']) || 0;
    const demandVar = parseFloat(record['Demand Var']) || 0;
    const importKWh = parseFloat(record['Import kWh']) || 0;
    
    // เก็บค่าแรกและสุดท้ายสำหรับคำนวณผลต่าง
    if (firstKWh === null) {
      firstKWh = importKWh;
    }
    lastKWh = importKWh;
    
    // หาค่าสูงสุดของ Demand Var
    maxDemandVar = Math.max(maxDemandVar, demandVar);
    
    // ตรวจสอบช่วงเวลา TOD
    const todInfo = getTODPeriodInfo(dateTime);
    
    // แสดง detailed log สำหรับ record แรกๆ  10 ตัว หรือทุก 10 ตัว
    if (index < 10 || index % 10 === 0) {
      console.log(`🔍 Record ${index + 1}: ${todInfo.timeStr} - ${todInfo.reason}`);
      console.log(`   📊 Demand W: ${demandW.toFixed(2)}, Import kWh: ${importKWh.toFixed(2)}, Demand Var: ${demandVar.toFixed(2)}`);
    }
    
    if (todInfo.isPeak) {
      peakRecords.push(record);
      periodCounts.peak++;
      // เก็บตัวอย่างเวลา Peak แรกๆ 5 ตัว
      if (sampleTimes.peak.length < 5) {
        sampleTimes.peak.push(todInfo.timeStr);
      }
      const oldPeakDemandW = peakDemandW;
      peakDemandW = Math.max(peakDemandW, demandW);
      
      // แสดง log เมื่อมีค่าใหม่สูงสุด
      if (peakDemandW > oldPeakDemandW) {
        console.log(`🔴 NEW PEAK DEMAND: ${peakDemandW.toFixed(2)} W at ${todInfo.timeStr} (was ${oldPeakDemandW.toFixed(2)} W)`);
      }
    } else if (todInfo.isPartial) {
      partialRecords.push(record);
      periodCounts.partial++;
      // เก็บตัวอย่างเวลา Partial แรกๆ 5 ตัว
      if (sampleTimes.partial.length < 5) {
        sampleTimes.partial.push(todInfo.timeStr);
      }
      const oldPartialDemandW = partialDemandW;
      partialDemandW = Math.max(partialDemandW, demandW);
      
      // แสดง log เมื่อมีค่าใหม่สูงสุด
      if (partialDemandW > oldPartialDemandW) {
        console.log(`🟡 NEW PARTIAL DEMAND: ${partialDemandW.toFixed(2)} W at ${todInfo.timeStr} (was ${oldPartialDemandW.toFixed(2)} W)`);
      }
    } else if (todInfo.isOffPeak) {
      offPeakRecords.push(record);
      periodCounts.offPeak++;
      // เก็บตัวอย่างเวลา Off Peak แรกๆ 5 ตัว
      if (sampleTimes.offPeak.length < 5) {
        sampleTimes.offPeak.push(todInfo.timeStr);
      }
      const oldOffPeakDemandW = offPeakDemandW;
      offPeakDemandW = Math.max(offPeakDemandW, demandW);
      
      // แสดง log เมื่อมีค่าใหม่สูงสุด
      if (offPeakDemandW > oldOffPeakDemandW) {
        console.log(`🟢 NEW OFF PEAK DEMAND: ${offPeakDemandW.toFixed(2)} W at ${todInfo.timeStr} (was ${oldOffPeakDemandW.toFixed(2)} W)`);
      }
    }
  });
  
  // คำนวณ total kWh จากผลต่าง
  const totalKWh = (lastKWh !== null && firstKWh !== null) 
    ? Math.max(0, lastKWh - firstKWh) 
    : 0;
  
  console.log(`📊 === TOD SEPARATION RESULTS ===`);
  console.log(`📊 สรุปการแยก periods:`);
  console.log(`   🔴 Peak (18:30-21:30): ${periodCounts.peak} records → ${peakRecords.length} records, Max Demand W: ${peakDemandW.toFixed(2)}`);
  if (sampleTimes.peak.length > 0) {
    console.log(`      🕰️ Sample times: ${sampleTimes.peak.join(', ')}`);
  }
  console.log(`   🟡 Partial (08:00-18:30): ${periodCounts.partial} records → ${partialRecords.length} records, Max Demand W: ${partialDemandW.toFixed(2)}`);
  if (sampleTimes.partial.length > 0) {
    console.log(`      🕰️ Sample times: ${sampleTimes.partial.join(', ')}`);
  } else {
    console.log(`      ⚠️ NO PARTIAL TIMES FOUND!`);
  }
  console.log(`   🟢 Off Peak (21:30-08:00): ${periodCounts.offPeak} records → ${offPeakRecords.length} records, Max Demand W: ${offPeakDemandW.toFixed(2)}`);
  if (sampleTimes.offPeak.length > 0) {
    console.log(`      🕰️ Sample times: ${sampleTimes.offPeak.join(', ')}`);
  }
  console.log(`   📊 Total processed: ${periodCounts.peak + periodCounts.partial + periodCounts.offPeak} records`);
  console.log(``);
  if (partialDemandW === 0) {
    console.log(`⚠️ WARNING: Partial Demand W = 0`);
    console.log(`🔍 สาเหตุที่เป็นไปได้:`);
    console.log(`   1. ไม่มีข้อมูลในช่วงเวลา 08:00-18:30 น.`);
    console.log(`   2. ข้อมูลทั้งหมดอยู่ในช่วง Peak (18:30-21:30) เท่านั้น`);
    console.log(`   3. ค่า Demand W ในช่วง Partial ทั้งหมดเป็น 0`);
    console.log(`   4. ข้อมูลอยู่ในวันหยุด (เป็น Off Peak ตลอดวัน)`);
    console.log(``);
    console.log(`🔍 การวิเคราะห์เพิ่มเติม:`);
    console.log(`   🕑 ข้อมูลเริ่ม: ${timeRangeAnalysis.earliest || 'N/A'}`);
    console.log(`   🕜 ข้อมูลสิ้นสุด: ${timeRangeAnalysis.latest || 'N/A'}`);
    console.log(`   ⏱️ ช่วงเวลาที่เลือก: 00:00-21:00 (ครอบคลุม Partial 08:00-18:30)`);
    console.log(``);
    console.log(`📊 สถิติการแยก periods จากข้อมูลจริง:`);
    console.log(`   🔴 Peak records: ${periodCounts.peak} (คาดว่ามีข้อมูลในช่วง 18:30-21:30)`);
    console.log(`   🟡 Partial records: ${periodCounts.partial} (คาดว่าไม่มีข้อมูลในช่วง 08:00-18:30)`);
    console.log(`   🟢 Off Peak records: ${periodCounts.offPeak} (คาดว่ามีข้อมูลนอกช่วงเวลาที่กำหนด)`);
    console.log(``);
    console.log(`🔍 คำแนะนำแก้ปัญหา:`);
    console.log(`   🕰️ เลือกช่วงเวลา: 00:00-21:00 (ครอบคลุมบางส่วนของ Partial)`);
    console.log(`   🟡 Partial ต้องการ: 08:00-18:30 (แต่ข้อมูลส่วนใหญ่อยู่ในช่วง 17:00-21:00)`);
    console.log(`   🔴 Peak จริง: 18:30-21:00 (มีข้อมูล)`);
    console.log(`   🟢 Off Peak จริง: 17:00-18:30 + 21:00 (มีข้อมูล)`);
    console.log(``);
    console.log(`💡 วิธีแก้ไข:`);
    console.log(`   1. เลือกช่วงเวลา 00:00-23:59 เพื่อครอบคลุม Partial`);
    console.log(`   2. หรือเลือกวันที่มีข้อมูลในช่วง 08:00-18:30`);
    console.log(`   3. ตรวจสอบว่าวันที่เลือกเป็นวันทำการหรือวันหยุด`);
  }
  console.log(`⚡ Max Demand Var: ${maxDemandVar.toFixed(2)} (สูงสุดโดยรวม)`);
  console.log(`📈 Total kWh: ${totalKWh.toFixed(2)} (ผลต่าง: ${lastKWh} - ${firstKWh})`);
  console.log(`================================`);
  
  const result = {
    peakRecords,
    partialRecords,
    offPeakRecords,
    peakDemandW,
    partialDemandW,
    offPeakDemandW,
    maxDemandVar,
    totalKWh,
    totalPeakRecords: peakRecords.length,
    totalPartialRecords: partialRecords.length,
    totalOffPeakRecords: offPeakRecords.length
  };
  
  console.log(`🔄 === SEPARATETODDATA RETURN VALUES ===`);
  console.log(`📊 Returning TOD data:`, {
    peakDemandW: result.peakDemandW,
    partialDemandW: result.partialDemandW,
    offPeakDemandW: result.offPeakDemandW,
    totalKWh: result.totalKWh,
    recordCounts: {
      peak: result.totalPeakRecords,
      partial: result.totalPartialRecords,
      offPeak: result.totalOffPeakRecords
    }
  });
  console.log(`================================`);
  
  return result;
};

// ฟังก์ชั่นสำหรับคำนวณ Power Factor ตามข้อกำหนด
  const calculatePowerFactorCharge = (row: ChargeDataRow) => {
    const demandVar = row.demandVar || 0; // ความต้องการพลังไฟฟ้ารีแอคตีฟเฉลี่ยใน 15 นาทีที่สูงสุด (กิโลวาร์)
    const onPeakDemandW = row.onPeakDemandW || 0; // ความต้องการพลังไฟฟ้าแอคตีฟเฉลี่ยใน 15 นาทีที่สูงสุด (กิโลวัตต์)
    const offPeakDemandW = row.offPeakDemandW || 0;
    const maxDemandW = Math.max(onPeakDemandW, offPeakDemandW);

    // console.log(`⚡ === POWER FACTOR CALCULATION ===`);
    // console.log(`📊 มิเตอร์: ${row.meterName}`);
    // console.log(`📊 ค่าจำลอง PF ของมิเตอร์ "${row.meterName}":`);
    // console.log(`   - Demand Var (กิโลวาร์) = ${demandVar} kvar`);
    // console.log(`   - On Peak Demand W (กิโลวัตต์) = ${onPeakDemandW} kW`);
    // console.log(`   - Off Peak Demand W (กิโลวัตต์) = ${offPeakDemandW} kW`);
    // console.log(`   - Max Demand W (กิโลวัตต์) = ${maxDemandW} kW`);
    
    // คำนวณ Power Factor จริง
    if (maxDemandW > 0 && demandVar > 0) {
      const apparentPower = Math.sqrt(maxDemandW * maxDemandW + demandVar * demandVar);
      const powerFactor = maxDemandW / apparentPower;
      // console.log(`   - Apparent Power = √(kW² + kvar²) = √(${maxDemandW}² + ${demandVar}²) = √(${maxDemandW * maxDemandW} + ${demandVar * demandVar}) = √${maxDemandW * maxDemandW + demandVar * demandVar} = ${apparentPower.toFixed(2)} kVA`);
      // console.log(`   - Power Factor = kW / kVA = ${maxDemandW} / ${apparentPower.toFixed(2)} = ${powerFactor.toFixed(4)}`);
      // console.log(`   - Power Factor (%) = ${(powerFactor * 100).toFixed(2)}%`);
    } else {
      // console.log(`   - ไม่สามารถคำนวณ Power Factor ได้ (kW หรือ kvar = 0)`);
    }

    // console.log(`🔢 สูตรการคำนวณ Power Factor Charge สำหรับมิเตอร์ "${row.meterName}":`);
    // console.log(`   - เงื่อนไข: หากกิโลวาร์เกินกว่าร้อยละ 61.97 ของกิโลวัตต์`);
    // console.log(`   - กิโลวาร์ที่อนุญาต = Max Demand W × 61.97%`);
    // console.log(`   - กิโลวาร์ที่อนุญาต = ${maxDemandW} × 0.6197 = ${(maxDemandW * 0.6197).toFixed(2)} kvar`);
    
    const allowedReactive = maxDemandW * 0.6197; // 61.97% ของกิโลวัตต์
    const excessReactive = demandVar - allowedReactive;
    
    // console.log(`   - กิโลวาร์ที่เกิน = Demand Var - กิโลวาร์ที่อนุญาต`);
    // console.log(`   - กิโลวาร์ที่เกิน = ${demandVar} - ${allowedReactive.toFixed(2)} = ${excessReactive.toFixed(2)} kvar`);

    let kilovar = 0;
    if (excessReactive > 0) {
      // console.log(`   - กิโลวาร์ที่เกิน > 0 → ต้องเสียค่า Power Factor`);
      // console.log(`   - กฎการปัดเศษ: เศษของกิโลวาร์ ถ้าไม่ถึง 0.5 กิโลวาร์ตัดทิ้ง ตั้งแต่ 0.5 กิโลวาร์ขึ้นไปคิดเป็น 1 กิโลวาร์`);
      
      if (excessReactive >= 0.5) {
        kilovar = Math.ceil(excessReactive); // ปัดขึ้น
        // console.log(`   - ${excessReactive.toFixed(2)} ≥ 0.5 → ปัดขึ้นเป็น ${kilovar} kvar`);
      } else {
        kilovar = 0; // ตัดทิ้ง
        // console.log(`   - ${excessReactive.toFixed(2)} < 0.5 → ตัดทิ้ง = ${kilovar} kvar`);
      }
    } else {
      // console.log(`   - กิโลวาร์ที่เกิน ≤ 0 → ไม่เสียค่า Power Factor`);
    }

    const powerFactorCharge = kilovar * 56.07;
    // console.log(`   - อัตราค่า Power Factor = 56.07 บาท/kvar`);
    // console.log(`   - Power Factor Charge = กิโลวาร์ที่เกิน × 56.07 บาท/kvar`);
    // console.log(`   - Power Factor Charge = ${kilovar} × 56.07 = ${powerFactorCharge.toFixed(2)} บาท`);

    // console.log(`✅ === POWER FACTOR CALCULATION END ===`);
    // console.log(`📋 สรุปผลลัพธ์สำหรับมิเตอร์ "${row.meterName}":`);
    // console.log(`   - กิโลวาร์ที่เกิน: ${excessReactive.toFixed(2)} kvar`);
    // console.log(`   - กิโลวาร์ที่คิดค่า: ${kilovar} kvar`);
    // console.log(`   - ค่า Power Factor: ${powerFactorCharge.toFixed(2)} บาท`);

    return powerFactorCharge;
  };

// ฟังก์ชั่นสำหรับใช้ไฟล์ calculator จริง
const useCalculatorFile = {
  // ใช้ไฟล์ 1_residential_service.js สำหรับประเภท 1.1.1, 1.1.2, 1.1.3.1, 1.1.3.2
  residentialService: (row: ChargeDataRow, calculationType: '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', voltageSelection?: Record<string, string>) => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    
    // console.log(`🏠 === ประเภท ${calculationType} (Residential Service) ===`);
    // console.log(`📊 มิเตอร์: ${row.meterName} (Class: ${calculationType})`);
    // console.log(`📊 Input Data:`);
    // console.log(`   - Total kWh = ${onPeakWh} + ${offPeakWh} = ${totalKWh}`);
    // console.log(`   - On Peak kWh = ${onPeakWh}`);
    // console.log(`   - Off Peak kWh = ${offPeakWh}`);
    
    switch (calculationType) {
      case '1.1.1':
        // บ้านอยู่อาศัยไม่เกิน 150 หน่วย/เดือน (อัตราปกติ) - Progressive Rate
        
        // แสดง log เฉพาะ slave_id = 1
        const shouldShowLog = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog) {
          console.log(`🔢 สูตรการคำนวณ 1.1.1 (Progressive Rate) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - อัตราไฟฟ้าแบบขั้นบันได (Progressive Rate)`);
          console.log(`   - ค่าบริการ: 8.19 บาท`);
          console.log(`   - อัตราค่าไฟฟ้า:`);
          console.log(`     * 15 หน่วยแรก (0-15): 2.3488 บาท/kWh`);
          console.log(`     * 10 หน่วยต่อไป (16-25): 2.9882 บาท/kWh`);
          console.log(`     * 10 หน่วยต่อไป (26-35): 3.2405 บาท/kWh`);
          console.log(`     * 65 หน่วยต่อไป (36-100): 3.6237 บาท/kWh`);
          console.log(`     * 50 หน่วยต่อไป (101-150): 3.7171 บาท/kWh`);
          console.log(`     * 250 หน่วยต่อไป (151-400): 4.2218 บาท/kWh`);
          console.log(`     * เกิน 400 หน่วยขึ้นไป (401+): 4.4217 บาท/kWh`);
          console.log(`   - Total kWh = ${totalKWh}`);
        }
        
        // คำนวณ Wh Charge แบบขั้นบันไดตามอัตราที่ถูกต้อง
        let whCharge = 0;
        let remainingTotalKWh = totalKWh;
        
        // ขั้นที่ 1: 15 หน่วยแรก (0-15)
        if (remainingTotalKWh > 0) {
          const tier1KWh = Math.min(remainingTotalKWh, 15);
          const tier1Charge = tier1KWh * 2.3488;
          whCharge += tier1Charge;
          remainingTotalKWh -= tier1KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 1: ${tier1KWh} หน่วย × 2.3488 = ${tier1Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 2: 10 หน่วยต่อไป (16-25)
        if (remainingTotalKWh > 0) {
          const tier2KWh = Math.min(remainingTotalKWh, 10);
          const tier2Charge = tier2KWh * 2.9882;
          whCharge += tier2Charge;
          remainingTotalKWh -= tier2KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 2: ${tier2KWh} หน่วย × 2.9882 = ${tier2Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 3: 10 หน่วยต่อไป (26-35)
        if (remainingTotalKWh > 0) {
          const tier3KWh = Math.min(remainingTotalKWh, 10);
          const tier3Charge = tier3KWh * 3.2405;
          whCharge += tier3Charge;
          remainingTotalKWh -= tier3KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 3: ${tier3KWh} หน่วย × 3.2405 = ${tier3Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 4: 65 หน่วยต่อไป (36-100)
        if (remainingTotalKWh > 0) {
          const tier4KWh = Math.min(remainingTotalKWh, 65);
          const tier4Charge = tier4KWh * 3.6237;
          whCharge += tier4Charge;
          remainingTotalKWh -= tier4KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 4: ${tier4KWh} หน่วย × 3.6237 = ${tier4Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 5: 50 หน่วยต่อไป (101-150)
        if (remainingTotalKWh > 0) {
          const tier5KWh = Math.min(remainingTotalKWh, 50);
          const tier5Charge = tier5KWh * 3.7171;
          whCharge += tier5Charge;
          remainingTotalKWh -= tier5KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 5: ${tier5KWh} หน่วย × 3.7171 = ${tier5Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 6: 250 หน่วยต่อไป (151-400)
        if (remainingTotalKWh > 0) {
          const tier6KWh = Math.min(remainingTotalKWh, 250);
          const tier6Charge = tier6KWh * 4.2218;
          whCharge += tier6Charge;
          remainingTotalKWh -= tier6KWh;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 6: ${tier6KWh} หน่วย × 4.2218 = ${tier6Charge.toFixed(2)} บาท`);
          }
        }
        
        // ขั้นที่ 7: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingTotalKWh > 0) {
          const tier7Charge = remainingTotalKWh * 4.4217;
          whCharge += tier7Charge;
          if (shouldShowLog) {
            console.log(`   - ขั้นที่ 7: ${remainingTotalKWh} หน่วย × 4.4217 = ${tier7Charge.toFixed(2)} บาท`);
          }
        }
        
        if (shouldShowLog) {
          console.log(`   - Wh Charge รวม = ${whCharge.toFixed(2)} บาท`);
        }
        
        // คำนวณ Wh Charge แยก On Peak และ Off Peak แบบขั้นบันได
        const onPeakWhValue = row.onPeakKWh || 0;
        const offPeakWhValue = row.offPeakKWh || 0;
        
        // ฟังก์ชันสำหรับคำนวณขั้นบันไดสำหรับ 1.1.1
        const calculateProgressiveRate111 = (kWh: number): number => {
          let charge = 0;
          let remaining = kWh;
          
          // ขั้นที่ 1: 15 หน่วยแรก (0-15)
          if (remaining > 0) {
            const tier1 = Math.min(remaining, 15);
            charge += tier1 * 2.3488;
            remaining -= tier1;
          }
          
          // ขั้นที่ 2: 10 หน่วยต่อไป (16-25)
          if (remaining > 0) {
            const tier2 = Math.min(remaining, 10);
            charge += tier2 * 2.9882;
            remaining -= tier2;
          }
          
          // ขั้นที่ 3: 10 หน่วยต่อไป (26-35)
          if (remaining > 0) {
            const tier3 = Math.min(remaining, 10);
            charge += tier3 * 3.2405;
            remaining -= tier3;
          }
          
          // ขั้นที่ 4: 65 หน่วยต่อไป (36-100)
          if (remaining > 0) {
            const tier4 = Math.min(remaining, 65);
            charge += tier4 * 3.6237;
            remaining -= tier4;
          }
          
          // ขั้นที่ 5: 50 หน่วยต่อไป (101-150)
          if (remaining > 0) {
            const tier5 = Math.min(remaining, 50);
            charge += tier5 * 3.7171;
            remaining -= tier5;
          }
          
          // ขั้นที่ 6: 250 หน่วยต่อไป (151-400)
          if (remaining > 0) {
            const tier6 = Math.min(remaining, 250);
            charge += tier6 * 4.2218;
            remaining -= tier6;
          }
          
          // ขั้นที่ 7: เกิน 400 หน่วยขึ้นไป (401+)
          if (remaining > 0) {
            charge += remaining * 4.4217;
          }
          
          return charge;
        };
        
        // คำนวณ On Peak Wh Charge แบบขั้นบันได
        const onPeakWhCharge = calculateProgressiveRate111(onPeakWhValue);
        
        // คำนวณ Off Peak Wh Charge แบบขั้นบันได
        const offPeakWhCharge = calculateProgressiveRate111(offPeakWhValue);
        
        if (shouldShowLog) {
          console.log(`   - On Peak Wh Charge = ${onPeakWhValue} kWh (คำนวณแบบขั้นบันได) = ${onPeakWhCharge.toFixed(2)} บาท`);
          console.log(`   - Off Peak Wh Charge = ${offPeakWhValue} kWh (คำนวณแบบขั้นบันได) = ${offPeakWhCharge.toFixed(2)} บาท`);
          console.log(`   - Service Charge = 8.19 บาท`);
          console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
          console.log(`   - Power Factor Charge = 0 บาท (ไม่มี)`);
        }
        
        return {
          whCharge: whCharge,
          onPeakWhCharge: onPeakWhCharge,
          offPeakWhCharge: offPeakWhCharge,
          serviceCharge: 8.19,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '1.1.2':
        // Progressive Rate - Different rates for different consumption tiers
        
        // console.log(`🔢 สูตรการคำนวณ 1.1.2 (Progressive Rate):`);
        // console.log(`   - Total kWh = ${onPeakWh} + ${offPeakWh} = ${totalKWh}`);
        // console.log(`   - อัตราไฟฟ้าแบบขั้นบันได:`);
        // console.log(`     * 150 หน่วยแรก (0-150) = 3.2484 บาท/kWh`);
        // console.log(`     * 250 หน่วยต่อไป (151-400) = 4.2218 บาท/kWh`);
        // console.log(`     * เกิน 400 หน่วยขึ้นไป (401+) = 4.4217 บาท/kWh`);
        
        // คำนวณอัตราไฟฟ้าแบบขั้นบันได
        let whCharge112 = 0;
        let remainingTotal112 = totalKWh;
        
        // ขั้นที่ 1: 150 หน่วยแรก (0-150)
        if (remainingTotal112 > 0) {
          const tier1KWh = Math.min(remainingTotal112, 150);
          const tier1Charge = tier1KWh * 3.2484;
          whCharge112 += tier1Charge;
          remainingTotal112 -= tier1KWh;
          // console.log(`   - ขั้นที่ 1: ${tier1KWh} หน่วย × 3.2484 = ${tier1Charge.toFixed(2)} บาท`);
        }
        
        // ขั้นที่ 2: 250 หน่วยต่อไป (151-400)
        if (remainingTotal112 > 0) {
          const tier2KWh = Math.min(remainingTotal112, 250);
          const tier2Charge = tier2KWh * 4.2218;
          whCharge112 += tier2Charge;
          remainingTotal112 -= tier2KWh;
          // console.log(`   - ขั้นที่ 2: ${tier2KWh} หน่วย × 4.2218 = ${tier2Charge.toFixed(2)} บาท`);
        }
        
        // ขั้นที่ 3: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingTotal112 > 0) {
          const tier3Charge = remainingTotal112 * 4.4217;
          whCharge112 += tier3Charge;
          // console.log(`   - ขั้นที่ 3: ${remainingTotal112} หน่วย × 4.4217 = ${tier3Charge.toFixed(2)} บาท`);
        }
        
        // คำนวณ On Peak และ Off Peak Wh Charge แยกกัน
        const onPeakWhValue112 = row.onPeakKWh || 0;
        const offPeakWhValue112 = row.offPeakKWh || 0;
        
        // คำนวณ On Peak Wh Charge แบบขั้นบันได
        let onPeakWhCharge112 = 0;
        let remainingOnPeak = onPeakWhValue112;
        
        // ขั้นที่ 1: 150 หน่วยแรก (0-150)
        if (remainingOnPeak > 0) {
          const tier1KWh = Math.min(remainingOnPeak, 150);
          const tier1Charge = tier1KWh * 3.2484;
          onPeakWhCharge112 += tier1Charge;
          remainingOnPeak -= tier1KWh;
        }
        
        // ขั้นที่ 2: 250 หน่วยต่อไป (151-400)
        if (remainingOnPeak > 0) {
          const tier2KWh = Math.min(remainingOnPeak, 250);
          const tier2Charge = tier2KWh * 4.2218;
          onPeakWhCharge112 += tier2Charge;
          remainingOnPeak -= tier2KWh;
        }
        
        // ขั้นที่ 3: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingOnPeak > 0) {
          const tier3Charge = remainingOnPeak * 4.4217;
          onPeakWhCharge112 += tier3Charge;
        }
        
        // คำนวณ Off Peak Wh Charge แบบขั้นบันได
        let offPeakWhCharge112 = 0;
        let remainingOffPeak = offPeakWhValue112;
        
        // ขั้นที่ 1: 150 หน่วยแรก (0-150)
        if (remainingOffPeak > 0) {
          const tier1KWh = Math.min(remainingOffPeak, 150);
          const tier1Charge = tier1KWh * 3.2484;
          offPeakWhCharge112 += tier1Charge;
          remainingOffPeak -= tier1KWh;
        }
        
        // ขั้นที่ 2: 250 หน่วยต่อไป (151-400)
        if (remainingOffPeak > 0) {
          const tier2KWh = Math.min(remainingOffPeak, 250);
          const tier2Charge = tier2KWh * 4.2218;
          offPeakWhCharge112 += tier2Charge;
          remainingOffPeak -= tier2KWh;
        }
        
        // ขั้นที่ 3: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingOffPeak > 0) {
          const tier3Charge = remainingOffPeak * 4.4217;
          offPeakWhCharge112 += tier3Charge;
        }
        
        // console.log(`   - Wh Charge รวม = ${whCharge112.toFixed(2)} บาท`);
        // console.log(`   - On Peak Wh Charge = ${onPeakWhValue112} kWh (คำนวณแบบขั้นบันได) = ${onPeakWhCharge112.toFixed(2)} บาท`);
        // console.log(`   - Off Peak Wh Charge = ${offPeakWhValue112} kWh (คำนวณแบบขั้นบันได) = ${offPeakWhCharge112.toFixed(2)} บาท`);
        // console.log(`   - Service Charge = 24.62 บาท (ปี 2566+)`);
        // console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
        // console.log(`   - Power Factor Charge = 0 บาท (ไม่มี)`);
        
        return {
          whCharge: whCharge112,
          onPeakWhCharge: onPeakWhCharge112,
          offPeakWhCharge: offPeakWhCharge112,
          serviceCharge: 24.62,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '1.1.3.1':
        // บ้านอยู่อาศัยแรงดัน 22-33 kV (อัตรา TOU) - TOU Rate
        const onPeakWh1131 = row.onPeakKWh || 0;
        const offPeakWh1131 = row.offPeakKWh || 0;
        const totalKWh1131 = onPeakWh1131 + offPeakWh1131;
        
        // แสดง log เฉพาะ slave_id = 1
        const shouldShowLog1131 = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog1131) {
          console.log(`🔢 สูตรการคำนวณ 1.1.3.1 (TOU Rate) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - บ้านอยู่อาศัยแรงดัน 22-33 kV (อัตรา TOU)`);
          console.log(`   - ค่าบริการ: 312.24 บาท`);
          console.log(`   - อัตราค่าไฟฟ้า TOU:`);
          console.log(`     * On Peak: 5.1135 บาท/kWh`);
          console.log(`     * Off Peak: 2.6037 บาท/kWh`);
          console.log(`   - On Peak kWh = ${onPeakWh1131}`);
          console.log(`   - Off Peak kWh = ${offPeakWh1131}`);
          console.log(`   - Total kWh = ${totalKWh1131}`);
        }
        
        // คำนวณ TOU Rate (ไม่ใช่ Progressive Rate)
        const onPeakWhCharge1131 = onPeakWh1131 * 5.1135;
        const offPeakWhCharge1131 = offPeakWh1131 * 2.6037;
        const totalCharge1131 = onPeakWhCharge1131 + offPeakWhCharge1131;
        
        if (shouldShowLog1131) {
          console.log(`   - On Peak Charge = ${onPeakWh1131} × 5.1135 = ${onPeakWhCharge1131.toFixed(2)} บาท`);
          console.log(`   - Off Peak Charge = ${offPeakWh1131} × 2.6037 = ${offPeakWhCharge1131.toFixed(2)} บาท`);
          console.log(`   - Total Wh Charge = ${totalCharge1131.toFixed(2)} บาท`);
          console.log(`   - Service Charge = 312.24 บาท`);
          console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
          console.log(`   - Power Factor Charge = 0 บาท (ไม่มี)`);
        }
        
        return {
          whCharge: totalCharge1131,
          onPeakWhCharge: onPeakWhCharge1131,
          offPeakWhCharge: offPeakWhCharge1131,
          serviceCharge: 312.24,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '1.1.3.2':
        // บ้านอยู่อาศัยแรงดันต่ำกว่า 22 kV (อัตรา TOU) - TOU Rate
        const onPeakWh1132 = row.onPeakKWh || 0;
        const offPeakWh1132 = row.offPeakKWh || 0;
        const totalKWh1132 = onPeakWh1132 + offPeakWh1132;
        
        // แสดง log เฉพาะ slave_id = 1
        const shouldShowLog1132 = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog1132) {
          console.log(`🔢 สูตรการคำนวณ 1.1.3.2 (TOU Rate) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - บ้านอยู่อาศัยแรงดันต่ำกว่า 22 kV (อัตรา TOU)`);
          console.log(`   - ค่าบริการ: 24.62 บาท`);
          console.log(`   - อัตราค่าไฟฟ้า TOU:`);
          console.log(`     * On Peak: 5.7982 บาท/kWh`);
          console.log(`     * Off Peak: 2.6369 บาท/kWh`);
          console.log(`   - On Peak kWh = ${onPeakWh1132}`);
          console.log(`   - Off Peak kWh = ${offPeakWh1132}`);
          console.log(`   - Total kWh = ${totalKWh1132}`);
        }
        
        // คำนวณ TOU Rate (ไม่ใช่ Progressive Rate)
        const onPeakWhCharge1132 = onPeakWh1132 * 5.7982;
        const offPeakWhCharge1132 = offPeakWh1132 * 2.6369;
        const totalCharge1132 = onPeakWhCharge1132 + offPeakWhCharge1132;
        
        if (shouldShowLog1132) {
          console.log(`   - On Peak Charge = ${onPeakWh1132} × 5.7982 = ${onPeakWhCharge1132.toFixed(2)} บาท`);
          console.log(`   - Off Peak Charge = ${offPeakWh1132} × 2.6369 = ${offPeakWhCharge1132.toFixed(2)} บาท`);
          console.log(`   - Total Wh Charge = ${totalCharge1132.toFixed(2)} บาท`);
          console.log(`   - Service Charge = 24.62 บาท`);
          console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
          console.log(`   - Power Factor Charge = 0 บาท (ไม่มี)`);
        }
        
        return {
          whCharge: totalCharge1132,
          onPeakWhCharge: onPeakWhCharge1132,
          offPeakWhCharge: offPeakWhCharge1132,
          serviceCharge: 24.62,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0
        };
    }
  },
  // ใช้ไฟล์ 2_small_general_service.js สำหรับประเภท 2.1.1, 2.1.2, 2.2.1, 2.2.2
  smallGeneralService: (row: ChargeDataRow, calculationType: '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    
    // console.log(`🏢 === ประเภท ${calculationType} (Small General Service) ===`);
    // console.log(`📊 มิเตอร์: ${row.meterName} (Class: ${calculationType})`);
    
    switch (calculationType) {
      case '2.1.1':
        // Small General Service - แรงดันต่ำกว่า 22 kV (Volt 2) - Type 1
        
        // แสดง log เฉพาะ slave_id = 1
        const shouldShowLog211 = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog211) {
          console.log(`🔢 สูตรการคำนวณ 2.1.1 (Small General Service) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - Small General Service แรงดันต่ำกว่า 22 kV`);
          console.log(`   - ค่าบริการ: 312.24 บาท`);
          console.log(`   - อัตราค่าไฟฟ้า: 3.9086 บาท/kWh`);
          console.log(`   - Total kWh = ${totalKWh}`);
        }
        
        // คำนวณ Wh Charge แบบอัตราคงที่
        const whCharge211 = totalKWh * 3.9086;
        
        if (shouldShowLog211) {
          console.log(`   - Wh Charge = ${totalKWh} × 3.9086 = ${whCharge211.toFixed(2)} บาท`);
          console.log(`   - Service Charge = 312.24 บาท`);
          console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
          console.log(`   - FT = ${totalKWh} × 0.1572 = ${(totalKWh * 0.1572).toFixed(2)} บาท`);
        }
        
        // คำนวณ On Peak และ Off Peak Wh Charge แยกกัน
        const onPeakWhCharge211 = onPeakWh * 3.9086;
        const offPeakWhCharge211 = offPeakWh * 3.9086;
        
        if (shouldShowLog211) {
          console.log(`   - On Peak Wh Charge = ${onPeakWh} × 3.9086 = ${onPeakWhCharge211.toFixed(2)} บาท`);
          console.log(`   - Off Peak Wh Charge = ${offPeakWh} × 3.9086 = ${offPeakWhCharge211.toFixed(2)} บาท`);
        }
        
        return {
          whCharge: whCharge211,
          onPeakWhCharge: onPeakWhCharge211,
          offPeakWhCharge: offPeakWhCharge211,
          serviceCharge: 312.24,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '2.1.2':
        // Normal Rate - แรงดันต่ำกว่า 22 kV (Volt 2) - Type 2
        // การคำนวณแบบขั้นบันได: 0-150 = 3.2484, 151-400 = 4.2218, 401+ = 4.4217
        const shouldShowLog212 = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog212) {
          console.log(`🔢 สูตรการคำนวณ 2.1.2 (Small General Service) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - Small General Service แรงดันต่ำกว่า 22 kV`);
          console.log(`   - ค่าบริการ: 33.29 บาท`);
          console.log(`   - อัตราค่าไฟฟ้าแบบขั้นบันได:`);
          console.log(`     * 0-150 หน่วย: 3.2484 บาท/kWh`);
          console.log(`     * 151-400 หน่วย: 4.2218 บาท/kWh`);
          console.log(`     * 401+ หน่วย: 4.4217 บาท/kWh`);
          console.log(`   - Total kWh = ${totalKWh}`);
        }
        
        let whCharge212 = 0;
        if (totalKWh <= 150) {
          whCharge212 = totalKWh * 3.2484;
          if (shouldShowLog212) {
            console.log(`   - Wh Charge = ${totalKWh} × 3.2484 = ${whCharge212.toFixed(2)} บาท (ขั้นที่ 1)`);
          }
        } else if (totalKWh <= 400) {
          const tier1 = 150 * 3.2484;
          const tier2 = (totalKWh - 150) * 4.2218;
          whCharge212 = tier1 + tier2;
          if (shouldShowLog212) {
            console.log(`   - Wh Charge = (150 × 3.2484) + (${totalKWh - 150} × 4.2218)`);
            console.log(`   - Wh Charge = ${tier1.toFixed(2)} + ${tier2.toFixed(2)} = ${whCharge212.toFixed(2)} บาท`);
          }
        } else {
          const tier1 = 150 * 3.2484;
          const tier2 = 250 * 4.2218;
          const tier3 = (totalKWh - 400) * 4.4217;
          whCharge212 = tier1 + tier2 + tier3;
          if (shouldShowLog212) {
            console.log(`   - Wh Charge = (150 × 3.2484) + (250 × 4.2218) + (${totalKWh - 400} × 4.4217)`);
            console.log(`   - Wh Charge = ${tier1.toFixed(2)} + ${tier2.toFixed(2)} + ${tier3.toFixed(2)} = ${whCharge212.toFixed(2)} บาท`);
          }
        }
        
        if (shouldShowLog212) {
          console.log(`   - Service Charge = 33.29 บาท`);
          console.log(`   - Demand Charge = 0 บาท (ไม่มี)`);
        }
        
        // คำนวณ On Peak และ Off Peak แยกกันสำหรับ 2.1.2
        const onPeakKWh = row.onPeakKWh || 0;
        const offPeakKWh = row.offPeakKWh || 0;
        
        let onPeakWhCharge212 = 0;
        if (onPeakKWh <= 150) {
          onPeakWhCharge212 = onPeakKWh * 3.2484;
        } else if (onPeakKWh <= 400) {
          onPeakWhCharge212 = 150 * 3.2484 + (onPeakKWh - 150) * 4.2218;
        } else {
          onPeakWhCharge212 = 150 * 3.2484 + 250 * 4.2218 + (onPeakKWh - 400) * 4.4217;
        }
        
        let offPeakWhCharge212 = 0;
        if (offPeakKWh <= 150) {
          offPeakWhCharge212 = offPeakKWh * 3.2484;
        } else if (offPeakKWh <= 400) {
          offPeakWhCharge212 = 150 * 3.2484 + (offPeakKWh - 150) * 4.2218;
        } else {
          offPeakWhCharge212 = 150 * 3.2484 + 250 * 4.2218 + (offPeakKWh - 400) * 4.4217;
        }
        
        return {
          whCharge: whCharge212,
          onPeakWhCharge: onPeakWhCharge212,
          offPeakWhCharge: offPeakWhCharge212,
          serviceCharge: 33.29, // ค่าบริการใหม่
          demandCharge: 0, // ประเภท 2.1.2 ไม่มี demand charge
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '2.2.1':
        // TOU Rate - แรงดันต่ำกว่า 22 kV (Volt 2) - Type 1
        const rateOn221 = 5.1135;
        const rateOff221 = 2.6037;
        const whCharge221 = (onPeakWh * rateOn221) + (offPeakWh * rateOff221);
        
        // คำนวณ On Peak และ Off Peak แยกกันสำหรับ 2.2.1
        const onPeakWhCharge221 = onPeakWh * rateOn221;
        const offPeakWhCharge221 = offPeakWh * rateOff221;
        
        return {
          whCharge: whCharge221,
          onPeakWhCharge: onPeakWhCharge221,
          offPeakWhCharge: offPeakWhCharge221,
          serviceCharge: 312.24, 
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      case '2.2.2':
        const rateOn222 = 5.7982;
        const rateOff222 = 2.6369;
        const whCharge222 = (onPeakWh * rateOn222) + (offPeakWh * rateOff222);
        const onPeakWhCharge222 = onPeakWh * rateOn222;
        const offPeakWhCharge222 = offPeakWh * rateOff222;
        return {
          whCharge: whCharge222,
          onPeakWhCharge: onPeakWhCharge222,
          offPeakWhCharge: offPeakWhCharge222,
          serviceCharge: 33.29, 
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
        
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0
        };
    }
  },
  
  mediumGeneralService: (row: ChargeDataRow, calculationType: '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    
    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;

    
    switch (calculationType) {
      case '3.1.1': {
        // Medium General Service - แรงดันต่ำกว่า 22 kV (Volt 3) - Type 1
        const shouldShowLog311 = row.slaveId === 1 || row.slaveId === '1';
        
        if (shouldShowLog311) {
          console.log(`🏭 สูตรการคำนวณ 3.1.1 (Medium General Service) - Slave ID: ${row.slaveId}:`);
          console.log(`   - มิเตอร์: ${row.meterName}`);
          console.log(`   - Medium General Service แรงดันต่ำกว่า 22 kV`);
          console.log(`   - ค่าบริการ: 312.24 บาท`);
          console.log(`   - อัตราค่าไฟฟ้า: 3.1097 บาท/kWh`);
          console.log(`   - อัตรา Demand: 175.70 บาท/kW`);
          console.log(`   - On Peak kWh = ${onPeakWh}`);
          console.log(`   - Off Peak kWh = ${offPeakWh}`);
          console.log(`   - On Peak Demand W = ${onPeakDemandW}`);
        }
        
        // คำนวณ Wh Charge
        const rate311 = 3.1097;
        const onPeakWhCharge311 = onPeakWh * rate311;
        const offPeakWhCharge311 = offPeakWh * rate311;
        const whCharge311 = onPeakWhCharge311 + offPeakWhCharge311;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate311 = 175.70; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge311 = onPeakDemandKW * demandRate311;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge311 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge311 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        if (shouldShowLog311) {
          console.log(`   - Wh Charge = (${onPeakWh} × ${rate311}) + (${offPeakWh} × ${rate311})`);
          console.log(`   - Wh Charge = ${onPeakWhCharge311.toFixed(2)} + ${offPeakWhCharge311.toFixed(2)} = ${whCharge311.toFixed(2)} บาท`);
          console.log(`   - Demand Charge = ${onPeakDemandKW.toFixed(3)} kW × ${demandRate311} = ${demandCharge311.toFixed(2)} บaท`);
          console.log(`   - Power Factor Check:`);
          console.log(`     * Demand kVAR = ${demandVar} kVAR`);
          console.log(`     * Demand kW = ${demandKW.toFixed(3)} kW`);
          console.log(`     * Threshold (61.97%) = ${pfThreshold.toFixed(3)} kVAR`);
          if (demandVar > pfThreshold) {
            console.log(`     * Excess kVAR = ${(demandVar - pfThreshold).toFixed(3)} kVAR`);
            console.log(`     * PF Charge = ${(demandVar - pfThreshold).toFixed(3)} × ${pfRate} = ${powerFactorCharge311.toFixed(2)} บาท`);
          } else {
            console.log(`     * ไม่เกินเกณฑ์ → ไม่มีค่าปรับ PF`);
          }
          console.log(`   - Service Charge = 312.24 บาท`);
        }
        
        return {
          whCharge: whCharge311,
          onPeakWhCharge: onPeakWhCharge311,
          offPeakWhCharge: offPeakWhCharge311,
          serviceCharge: 312.24,
          demandCharge: demandCharge311,
          onPeakDemandCharge: demandCharge311,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge311
        };
      }
      case '3.1.2': {
          // Medium General Service - แรงดันต่ำกว่า 22 kV (Volt 3) - Type 1
          const shouldShowLog312 = row.slaveId === 2 || row.slaveId === '1';
        
          if (shouldShowLog312) {
            console.log(`🏭 สูตรการคำนวณ 3.1.2 (Medium General Service) - Slave ID: ${row.slaveId}:`);
            console.log(`   - มิเตอร์: ${row.meterName}`);
            console.log(`   - Medium General Service แรงดันต่ำกว่า 22 kV`);
            console.log(`   - ค่าบริการ: 312.24 บาท`);
            console.log(`   - อัตราค่าไฟฟ้า: 3.1097 บาท/kWh`);
            console.log(`   - อัตรา Demand: 175.70 บาท/kW`);
            console.log(`   - On Peak kWh = ${onPeakWh}`);
            console.log(`   - Off Peak kWh = ${offPeakWh}`);
            console.log(`   - On Peak Demand W = ${onPeakDemandW}`);
          }
          
          // คำนวณ Wh Charge
          const rate312 = 3.1471;
          const onPeakWhCharge312 = onPeakWh * rate312;
          const offPeakWhCharge312 = offPeakWh * rate312;
          const whCharge312 = onPeakWhCharge312 + offPeakWhCharge312;
          
          // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
          const demandRate312 = 196.26; // บาท/kW
          const onPeakDemandKW = onPeakDemandW ; 
          const demandCharge312 = onPeakDemandKW * demandRate312;
          
          // คำนวณ Power Factor Charge
          // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
          const demandVar = row.demandVar || 0; // kVAR
          const demandKW = onPeakDemandKW; // kW
          const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
          const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
          
          let powerFactorCharge312 = 0;
          if (demandVar > pfThreshold) {
            const excessVar = demandVar - pfThreshold;
            powerFactorCharge312 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
          }
          
          if (shouldShowLog312) {
            console.log(`   - Wh Charge = (${onPeakWh} × ${rate312}) + (${offPeakWh} × ${rate312})`);
            console.log(`   - Wh Charge = ${onPeakWhCharge312.toFixed(2)} + ${offPeakWhCharge312.toFixed(2)} = ${whCharge312.toFixed(2)} บาท`);
            console.log(`   - Demand Charge = ${onPeakDemandKW.toFixed(3)} kW × ${demandRate312} = ${demandCharge312.toFixed(2)} บาท`);
            console.log(`   - Power Factor Check:`);
            console.log(`     * Demand kVAR = ${demandVar} kVAR`);
            console.log(`     * Demand kW = ${demandKW.toFixed(3)} kW`);
            console.log(`     * Threshold (61.97%) = ${pfThreshold.toFixed(3)} kVAR`);
            if (demandVar > pfThreshold) {
              console.log(`     * Excess kVAR = ${(demandVar - pfThreshold).toFixed(3)} kVAR`);
              console.log(`     * PF Charge = ${(demandVar - pfThreshold).toFixed(3)} × ${pfRate} = ${powerFactorCharge312.toFixed(2)} บาท`);
            } else {
              console.log(`     * ไม่เกินเกณฑ์ → ไม่มีค่าปรับ PF`);
            }
            console.log(`   - Service Charge = 312.24 บาท`);
          }
          
          return {
            whCharge: whCharge312,
            onPeakWhCharge: onPeakWhCharge312,
            offPeakWhCharge: offPeakWhCharge312,
            serviceCharge: 312.24,
            demandCharge: demandCharge312,
            onPeakDemandCharge: demandCharge312,
            offPeakDemandCharge: 0,
            powerFactorCharge: powerFactorCharge312
          };
        }
      case '3.1.3': {
          
          const rate312 = 3.1751;
          const onPeakWhCharge312 = onPeakWh * rate312;
          const offPeakWhCharge312 = offPeakWh * rate312;
          const whCharge312 = onPeakWhCharge312 + offPeakWhCharge312;
          
          // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
          const demandRate312 = 221.5; // บาท/kW
          const onPeakDemandKW = onPeakDemandW ; 
          const demandCharge312 = onPeakDemandKW * demandRate312;
          
          // คำนวณ Power Factor Charge
          // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
          const demandVar = row.demandVar || 0; // kVAR
          const demandKW = onPeakDemandKW; // kW
          const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
          const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
          
          let powerFactorCharge312 = 0;
          if (demandVar > pfThreshold) {
            const excessVar = demandVar - pfThreshold;
            powerFactorCharge312 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
          }
          
          return {
            whCharge: whCharge312,
            onPeakWhCharge: onPeakWhCharge312,
            offPeakWhCharge: offPeakWhCharge312,
            serviceCharge: 312.24,
            demandCharge: demandCharge312,
            onPeakDemandCharge: demandCharge312,
            offPeakDemandCharge: 0,
            powerFactorCharge: powerFactorCharge312
          };
        }
      case '3.2.1': { 
        const rateOn321 = 4.1025;
        const rateOff321 = 2.5849;
        const onPeakWhCharge321 = onPeakWh * rateOn321;
        const offPeakWhCharge321 = offPeakWh * rateOff321;
        const whCharge321 = onPeakWhCharge321 + offPeakWhCharge321;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate321 = 74.14; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge321 = onPeakDemandKW * demandRate321;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge321 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge321 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge321,
          onPeakWhCharge: onPeakWhCharge321,
          offPeakWhCharge: offPeakWhCharge321,
          serviceCharge: 312.24,
          demandCharge: demandCharge321,
          onPeakDemandCharge: demandCharge321,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge321
        };
        }
      case '3.2.2': {
        const rateOn322 = 4.1839;
        const rateOff322 = 2.6037;
        const onPeakWhCharge322 = onPeakWh * rateOn322;
        const offPeakWhCharge322 = offPeakWh * rateOff322;
        const whCharge322 = onPeakWhCharge322 + offPeakWhCharge322;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate322 = 132.93; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge322 = onPeakDemandKW * demandRate322;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge322 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge322 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge322,
          onPeakWhCharge: onPeakWhCharge322,
          offPeakWhCharge: offPeakWhCharge322,
          serviceCharge: 312.24,
          demandCharge: demandCharge322,
          onPeakDemandCharge: demandCharge322,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge322
        };
        }
      case '3.2.3': {
        const rateOn322 = 4.3297;
        const rateOff322 = 2.6369;
        const onPeakWhCharge322 = onPeakWh * rateOn322;
        const offPeakWhCharge322 = offPeakWh * rateOff322;
        const whCharge322 = onPeakWhCharge322 + offPeakWhCharge322;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate322 = 210.00; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge322 = onPeakDemandKW * demandRate322;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge322 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge322 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge322,
          onPeakWhCharge: onPeakWhCharge322,
          offPeakWhCharge: offPeakWhCharge322,
          serviceCharge: 312.24,
          demandCharge: demandCharge322,
          onPeakDemandCharge: demandCharge322,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge322
        };
        }
        
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0,
          powerFactorCharge: 0
        };
    }
  },
  
  // ใช้ไฟล์ 4_large_general_service.js สำหรับประเภท 4.1.1, 4.1.2, 4.1.3, 4.2.1, 4.2.2, 4.2.3
  largeGeneralService: (row: ChargeDataRow, calculationType: '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;
    

    switch (calculationType) {
      case '4.1.1': {
        const whRate411 = 3.1097;
        
        const peakDemandRate411 = 224.30; // บาท/kW - Peak
        const partialDemandRate411 = 29.91; // บาท/kW - Partial (คิดเฉพาะส่วนที่เกิน Peak)
        const offPeakDemandRate411 = 0; // บาท/kW - Off Peak
        const serviceCharge411 = 312.24; // บาท
        
        const peakDemandW = row.peakDemandW || row.onPeakDemandW || 0;
        const partialDemandW = row.partialDemandW || 0;
        const offPeakDemandW = row.offPeakDemandW || 0;
        const totalKWh411 = row.totalKWh || totalKWh;
        
        const whCharge411 = totalKWh411 * whRate411;
        const onPeakWhCharge411 = onPeakWh * whRate411;
        const offPeakWhCharge411 = offPeakWh * whRate411;
    
        const peakDemandKW = peakDemandW;
        const partialDemandKW = partialDemandW;
        const offPeakDemandKW = offPeakDemandW;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = partialDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; 
        const pfRate = 56.07; 
    
        const partialExcessKW = Math.max(0, partialDemandKW - peakDemandKW);
        
        const peakDemandCharge = peakDemandKW * peakDemandRate411;
        const partialDemandCharge = partialExcessKW * partialDemandRate411; 
        const offPeakDemandCharge = offPeakDemandKW * offPeakDemandRate411;
        const totalDemandCharge411 = peakDemandCharge + partialDemandCharge + offPeakDemandCharge;
      
        let powerFactorCharge411 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge411 = Math.round(excessVar * pfRate * 2) / 2; 
        }
        const total411 = whCharge411 + totalDemandCharge411 + powerFactorCharge411 + serviceCharge411;
        console.log('total411 : ', total411)
        console.log('powerFactorCharge411 : ', powerFactorCharge411)
        return {
          whCharge: whCharge411,
          onPeakWhCharge: onPeakWhCharge411,
          offPeakWhCharge: offPeakWhCharge411,
          serviceCharge: serviceCharge411,
          demandCharge: totalDemandCharge411,
          peakDemandCharge: peakDemandCharge,
          partialDemandCharge: partialDemandCharge, 
          partialExcessKW: partialExcessKW, 
          offPeakDemandCharge: offPeakDemandCharge,
          powerFactorCharge: powerFactorCharge411,
          total: total411
        };
      }
      case '4.1.2': {
        const whRate412 = 3.1471;
        
        const peakDemandRate412 = 285.05; // บาท/kW - Peak
        const partialDemandRate412 = 58.88; // บาท/kW - Partial (คิดเฉพาะส่วนที่เกิน Peak)
        const offPeakDemandRate412 = 0; // บาท/kW - Off Peak
        const serviceCharge412 = 312.24; // บาท
        
        const peakDemandW = row.peakDemandW || row.onPeakDemandW || 0;
        const partialDemandW = row.partialDemandW || 0;
        const offPeakDemandW = row.offPeakDemandW || 0;
        const totalKWh412 = row.totalKWh || totalKWh;
        
        const whCharge412 = totalKWh412 * whRate412;
        const onPeakWhCharge412 = onPeakWh * whRate412;
        const offPeakWhCharge412 = offPeakWh * whRate412;
        const peakDemandKW = peakDemandW;
        const partialDemandKW = partialDemandW;
        const offPeakDemandKW = offPeakDemandW;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = partialDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; 
        const pfRate = 56.07; 
    
        const partialExcessKW = Math.max(0, partialDemandKW - peakDemandKW);
        
        const peakDemandCharge = peakDemandKW * peakDemandRate412;
        const partialDemandCharge = partialExcessKW * partialDemandRate412; 
        const offPeakDemandCharge = offPeakDemandKW * offPeakDemandRate412;
        const totalDemandCharge412 = peakDemandCharge + partialDemandCharge + offPeakDemandCharge;
      
        let powerFactorCharge412 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge412 = Math.round(excessVar * pfRate * 2) / 2; 
        }
        const total412 = whCharge412 + totalDemandCharge412 + powerFactorCharge412 + serviceCharge412;
        console.log('total412 : ', total412)
        console.log('powerFactorCharge412 : ', powerFactorCharge412)
        return {
          whCharge: whCharge412,
          onPeakWhCharge: onPeakWhCharge412,
          offPeakWhCharge: offPeakWhCharge412,
          serviceCharge: serviceCharge412,
          demandCharge: totalDemandCharge412,
          peakDemandCharge: peakDemandCharge,
          partialDemandCharge: partialDemandCharge, 
          partialExcessKW: partialExcessKW, 
          offPeakDemandCharge: offPeakDemandCharge,
          powerFactorCharge: powerFactorCharge412,
          total: total412
        };
      }
      case '4.1.3': {
        const whRate413 = 3.1751;
        
        const peakDemandRate413 = 332.71; // บาท/kW - Peak
        const partialDemandRate413 = 68.22; // บาท/kW - Partial (คิดเฉพาะส่วนที่เกิน Peak)
        const offPeakDemandRate413 = 0; // บาท/kW - Off Peak
        const serviceCharge413 = 312.24; // บาท
        
        const peakDemandW = row.peakDemandW || row.onPeakDemandW || 0;
        const partialDemandW = row.partialDemandW || 0;
        const offPeakDemandW = row.offPeakDemandW || 0;
        const totalKWh413 = row.totalKWh || totalKWh;
        
        const whCharge413 = totalKWh413 * whRate413;
        const onPeakWhCharge413 = onPeakWh * whRate413;
        const offPeakWhCharge413 = offPeakWh * whRate413; 
        
        const peakDemandKW = peakDemandW;
        const partialDemandKW = partialDemandW;
        const offPeakDemandKW = offPeakDemandW;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = partialDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; 
        const pfRate = 56.07; 
    
        const partialExcessKW = Math.max(0, partialDemandKW - peakDemandKW);
        
        const peakDemandCharge = peakDemandKW * peakDemandRate413;
        const partialDemandCharge = partialExcessKW * partialDemandRate413; 
        const offPeakDemandCharge = offPeakDemandKW * offPeakDemandRate413;
        const totalDemandCharge413 = peakDemandCharge + partialDemandCharge + offPeakDemandCharge;
      
        let powerFactorCharge413 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge413 = Math.round(excessVar * pfRate * 2) / 2; 
        }
        const total413 = whCharge413 + totalDemandCharge413 + powerFactorCharge413 + serviceCharge413;
        console.log('total413 : ', total413)
        console.log('powerFactorCharge413 : ', powerFactorCharge413)
        return {
          whCharge: whCharge413,
          onPeakWhCharge: onPeakWhCharge413,
          offPeakWhCharge: offPeakWhCharge413,
          serviceCharge: serviceCharge413,
          demandCharge: totalDemandCharge413,
          peakDemandCharge: peakDemandCharge,
          partialDemandCharge: partialDemandCharge, 
          partialExcessKW: partialExcessKW, 
          offPeakDemandCharge: offPeakDemandCharge,
          powerFactorCharge: powerFactorCharge413,
          total: total413
        };
      }
      case '4.2.1': {
        const rateOn421 = 4.1025;
        const rateOff421 = 2.5849;
        const onPeakWhCharge421 = onPeakWh * rateOn421;
        const offPeakWhCharge421 = offPeakWh * rateOff421;
        const whCharge421 = onPeakWhCharge421 + offPeakWhCharge421;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate421 = 74.14; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge421 = onPeakDemandKW * demandRate421;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge421 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge421 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge421,
          onPeakWhCharge: onPeakWhCharge421,
          offPeakWhCharge: offPeakWhCharge421,
          serviceCharge: 312.24,
          demandCharge: demandCharge421,
          onPeakDemandCharge: demandCharge421,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge421
        };
      }
      case '4.2.2': {
        const rateOn422 = 4.1839;
        const rateOff422 = 2.6037;
        const onPeakWhCharge422 = onPeakWh * rateOn422;
        const offPeakWhCharge422 = offPeakWh * rateOff422;
        const whCharge422 = onPeakWhCharge422 + offPeakWhCharge422;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate422 = 132.93; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge422 = onPeakDemandKW * demandRate422;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge422 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge422 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge422,
          onPeakWhCharge: onPeakWhCharge422,
          offPeakWhCharge: offPeakWhCharge422,
          serviceCharge: 312.24,
          demandCharge: demandCharge422,
          onPeakDemandCharge: demandCharge422,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge422
        };
      }
      case '4.2.3': {
        const rateOn423 = 4.3297;
        const rateOff423 = 2.6369;
        const onPeakWhCharge423 = onPeakWh * rateOn423;
        const offPeakWhCharge423 = offPeakWh * rateOff423;
        const whCharge423 = onPeakWhCharge423 + offPeakWhCharge423;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate423 = 210.00; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge423 = onPeakDemandKW * demandRate423;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge423 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge423 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge423,
          onPeakWhCharge: onPeakWhCharge423,
          offPeakWhCharge: offPeakWhCharge423,
          serviceCharge: 312.24,
          demandCharge: demandCharge423,
          onPeakDemandCharge: demandCharge423,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge423
        };
      } 
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0,
          powerFactorCharge: 0
        };
    }
  },
  
  // ใช้ไฟล์ 5_specific_business_service.js สำหรับประเภท 5.1.1, 5.1.2, 5.1.3, 5.2.1, 5.2.2, 5.2.3
  specificBusinessService: (row: ChargeDataRow, calculationType: '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;

    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;
    
    
    switch (calculationType) {
      case '5.1.1': {
         // คำนวณ Wh Charge
         const rate511 = 3.1097;
         const onPeakWhCharge511 = onPeakWh * rate511;
         const offPeakWhCharge511 = offPeakWh * rate511;
         const whCharge511 = onPeakWhCharge511 + offPeakWhCharge511;
         
         // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
         const demandRate511 = 220.56; // บาท/kW
         const onPeakDemandKW = onPeakDemandW ; 
         const demandCharge511 = onPeakDemandKW * demandRate511;
         
         // คำนวณ Power Factor Charge
         // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
         const demandVar = row.demandVar || 0; // kVAR
         const demandKW = onPeakDemandKW; // kW
         const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
         const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
         
         let powerFactorCharge511 = 0;
         if (demandVar > pfThreshold) {
           const excessVar = demandVar - pfThreshold;
           powerFactorCharge511 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
         }
         
         return {
           whCharge: whCharge511,
           onPeakWhCharge: onPeakWhCharge511,
           offPeakWhCharge: offPeakWhCharge511,
           serviceCharge: 312.24,
           demandCharge: demandCharge511,
           onPeakDemandCharge: demandCharge511,
           offPeakDemandCharge: 0,
           powerFactorCharge: powerFactorCharge511
         };
      }  
      case '5.1.2': {
        // คำนวณ Wh Charge
        const rate512 = 3.1471;
        const onPeakWhCharge512 = onPeakWh * rate512;
        const offPeakWhCharge512 = offPeakWh * rate512;
        const whCharge512 = onPeakWhCharge512 + offPeakWhCharge512;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate512 = 256.07; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge512 = onPeakDemandKW * demandRate512;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge512 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge512 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge512,
          onPeakWhCharge: onPeakWhCharge512,
          offPeakWhCharge: offPeakWhCharge512,
          serviceCharge: 312.24,
          demandCharge: demandCharge512,
          onPeakDemandCharge: demandCharge512,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge512
        };
      }   
      case '5.1.3': {
         // คำนวณ Wh Charge
         const rate513 = 3.1751;
         const onPeakWhCharge513 = onPeakWh * rate513;
         const offPeakWhCharge513 = offPeakWh * rate513;
         const whCharge513 = onPeakWhCharge513 + offPeakWhCharge513;
         
         // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
         const demandRate513 = 276.64; // บาท/kW
         const onPeakDemandKW = onPeakDemandW ; 
         const demandCharge513 = onPeakDemandKW * demandRate513;
         
         // คำนวณ Power Factor Charge
         // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
         const demandVar = row.demandVar || 0; // kVAR
         const demandKW = onPeakDemandKW; // kW
         const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
         const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
         
         let powerFactorCharge513 = 0;
         if (demandVar > pfThreshold) {
           const excessVar = demandVar - pfThreshold;
           powerFactorCharge513 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
         }
         
         return {
           whCharge: whCharge513,
           onPeakWhCharge: onPeakWhCharge513,
           offPeakWhCharge: offPeakWhCharge513,
           serviceCharge: 312.24,
           demandCharge: demandCharge513,
           onPeakDemandCharge: demandCharge513,
           offPeakDemandCharge: 0,
           powerFactorCharge: powerFactorCharge513
         };
      }  
      case '5.2.1': {
        const rateon521 = 4.1025;
        const rateoff521 = 2.5849;
        const onPeakWhCharge521 = onPeakWh * rateon521;
        const offPeakWhCharge521 = offPeakWh * rateoff521;
        const whCharge521 = onPeakWhCharge521 + offPeakWhCharge521;
        
        // คำนวณ Demand Charge (ใช้ค่าสูงสุดในช่วงเวลา On Peak)
        const demandRate521 = 74.14; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge521 = onPeakDemandKW * demandRate521;
        
        // คำนวณ Power Factor Charge
        // ตรวจสอบว่า kVAR > 61.97% ของ kW หรือไม่
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge521 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge521 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
      
        
        return {
          whCharge: whCharge521,
          onPeakWhCharge: onPeakWhCharge521,
          offPeakWhCharge: offPeakWhCharge521,
          serviceCharge: 312.24,
          demandCharge: demandCharge521,
          onPeakDemandCharge: demandCharge521,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge521
        };
      }  
      case '5.2.2': {
        const rateOn522 = 4.1839;
        const rateOff522 = 2.6037;
        const onPeakWhCharge522 = onPeakWh * rateOn522;
        const offPeakWhCharge522 = offPeakWh * rateOff522;
        const whCharge522 = onPeakWhCharge522 + offPeakWhCharge522;
        
      
        const demandRate522 = 132.93; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge522 = onPeakDemandKW * demandRate522;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge522 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge522 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge522,
          onPeakWhCharge: onPeakWhCharge522,
          offPeakWhCharge: offPeakWhCharge522,
          serviceCharge: 312.24,
          demandCharge: demandCharge522,
          onPeakDemandCharge: demandCharge522,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge522
        };
      }   
      case '5.2.3': {
        const rateOn523 = 4.1025;
        const rateOff523 = 2.5849;
        const onPeakWhCharge523 = onPeakWh * rateOn523;
        const offPeakWhCharge523 = offPeakWh * rateOff523;
        const whCharge523 = onPeakWhCharge523 + offPeakWhCharge523;
        
      
        const demandRate523 = 74.14; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge523 = onPeakDemandKW * demandRate523;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge523 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge523 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge523,
          onPeakWhCharge: onPeakWhCharge523,
          offPeakWhCharge: offPeakWhCharge523,
          serviceCharge: 312.24,
          demandCharge: demandCharge523,
          onPeakDemandCharge: demandCharge523,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge523
        };
      }         
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0,
          powerFactorCharge: 0
        };
    }
  },
  
  // ใช้ไฟล์ 6_gov_nonprofit_org.js สำหรับประเภท 6.1.1, 6.1.2, 6.1.3, 6.2.1, 6.2.2, 6.2.3
  govNonprofitOrg: (row: ChargeDataRow, calculationType: '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;
    
  
    
    switch (calculationType) {
      case '6.1.1': {
        const whCharge611 = totalKWh * 3.4149;
        const onPeakWhCharge611 = onPeakWh * 3.4149;
        const offPeakWhCharge611 = offPeakWh * 3.4149; 
        return {
          whCharge: whCharge611,
          onPeakWhCharge: onPeakWhCharge611,
          offPeakWhCharge: offPeakWhCharge611,
          serviceCharge: 312.24,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
      } 
      case '6.1.2': {
        const whCharge612 = totalKWh * 3.5849;
        const onPeakWhCharge612 = onPeakWh * 3.5849;
        const offPeakWhCharge612 = offPeakWh * 3.5849; 
        return {
          whCharge: whCharge612,
          onPeakWhCharge: onPeakWhCharge612,
          offPeakWhCharge: offPeakWhCharge612,
          serviceCharge: 312.24,
          demandCharge: 0,
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
      } 
      case '6.1.3': {
        // ฟังก์ชันคำนวณแบบขั้นบันได (tiered pricing)
        const calculateTieredCharge = (kWh: number): number => {
          if (kWh <= 10) {
            // 10 หน่วยแรก (0-10) หน่วยละ 2.8013
            return kWh * 2.8013;
          } else {
            // 10 หน่วยแรก + หน่วยเกิน 10 หน่วยละ 3.8919
            return (10 * 2.8013) + ((kWh - 10) * 3.8919);
          }
        };
        
        // คำนวณค่าไฟรวม
        const whCharge613 = calculateTieredCharge(totalKWh);
        
        // คำนวณ On Peak และ Off Peak แยกกัน
        const onPeakKWh = row.onPeakKWh || 0;
        const offPeakKWh = row.offPeakKWh || 0;
        
        const onPeakWhCharge613 = calculateTieredCharge(onPeakKWh);
        const offPeakWhCharge613 = calculateTieredCharge(offPeakKWh);
        
        
        
        return {
          whCharge: whCharge613,
          onPeakWhCharge: onPeakWhCharge613,
          offPeakWhCharge: offPeakWhCharge613,
          serviceCharge: 20.00, 
          demandCharge: 0, 
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
      }    
      case '6.2.1': {
        const rateOn621 = 4.1025;
        const rateOff621 = 2.5849;
        const onPeakWhCharge621 = onPeakWh * rateOn621;
        const offPeakWhCharge621 = offPeakWh * rateOff621;
        const whCharge621 = onPeakWhCharge621 + offPeakWhCharge621;
        
      
        const demandRate621 = 74.14; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge621 = onPeakDemandKW * demandRate621;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge621 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge621 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge621,
          onPeakWhCharge: onPeakWhCharge621,
          offPeakWhCharge: offPeakWhCharge621,
          serviceCharge: 312.24,
          demandCharge: demandCharge621,
          onPeakDemandCharge: demandCharge621,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge621
        };
      }  
      case '6.2.2': {
        const rateOn622 = 4.1839;
        const rateOff622 = 2.26037;
        const onPeakWhCharge622 = onPeakWh * rateOn622;
        const offPeakWhCharge622 = offPeakWh * rateOff622;
        const whCharge622 = onPeakWhCharge622 + offPeakWhCharge622;
        
      
        const demandRate622 = 132.93; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge622 = onPeakDemandKW * demandRate622;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge622 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge622 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge622,
          onPeakWhCharge: onPeakWhCharge622,
          offPeakWhCharge: offPeakWhCharge622,
          serviceCharge: 312.24,
          demandCharge: demandCharge622,
          onPeakDemandCharge: demandCharge622,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge622
        };
      }  
      case '6.2.3': {
        const rateOn623 = 4.3297;
        const rateOff623 = 2.6369;
        const onPeakWhCharge623 = onPeakWh * rateOn623;
        const offPeakWhCharge623 = offPeakWh * rateOff623;
        const whCharge623 = onPeakWhCharge623 + offPeakWhCharge623;
        
      
        const demandRate623 = 210.00; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge623 = onPeakDemandKW * demandRate623;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge623 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge623 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge623,
          onPeakWhCharge: onPeakWhCharge623,
          offPeakWhCharge: offPeakWhCharge623,
          serviceCharge: 312.24,
          demandCharge: demandCharge623,
          onPeakDemandCharge: demandCharge623,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge623
        };
      }  
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0,
          powerFactorCharge: 0
        };
    }
  },
  
  // ใช้ไฟล์ 7_water_pumping_agricultural.js สำหรับประเภท 7.1, 7.2.1, 7.2.2
  waterPumpingAgricultural: (row: ChargeDataRow, calculationType: '7.1' | '7.2.1' | '7.2.2') => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;
 
    
    switch (calculationType) {
      case '7.1': {
        // ฟังก์ชันคำนวณแบบขั้นบันได (tiered pricing) สำหรับ 7.1
        const calculateTieredCharge71 = (kWh: number): number => {
          if (kWh <= 100) {
            // 100 หน่วยแรก (0-100) หน่วยละ 2.0889
            return kWh * 2.0889;
          } else {
            // 100 หน่วยแรก + หน่วยเกิน 100 หน่วยละ 3.2405
            return (100 * 2.0889) + ((kWh - 100) * 3.2405);
          }
        };
        
        // คำนวณค่าไฟรวม
        const whCharge71 = calculateTieredCharge71(totalKWh);
        
        // คำนวณ On Peak และ Off Peak แยกกัน
        const onPeakKWh = row.onPeakKWh || 0;
        const offPeakKWh = row.offPeakKWh || 0;
        
        const onPeakWhCharge71 = calculateTieredCharge71(onPeakKWh);
        const offPeakWhCharge71 = calculateTieredCharge71(offPeakKWh);
        return {
          whCharge: whCharge71,
          onPeakWhCharge: onPeakWhCharge71,
          offPeakWhCharge: offPeakWhCharge71,
          serviceCharge: 115.16, 
          demandCharge: 0, 
          onPeakDemandCharge: 0,
          offPeakDemandCharge: 0,
          powerFactorCharge: 0
        };
      }        
      case '7.2.1': {
        const rateOn721 = 4.1839;
        const rateOff721 = 2.26037;
        const onPeakWhCharge721 = onPeakWh * rateOn721;
        const offPeakWhCharge721 = offPeakWh * rateOff721;
        const whCharge721 = onPeakWhCharge721 + offPeakWhCharge721;
        
      
        const demandRate721 = 132.93; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge721 = onPeakDemandKW * demandRate721;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge721 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge721 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge721,
          onPeakWhCharge: onPeakWhCharge721,
          offPeakWhCharge: offPeakWhCharge721,
          serviceCharge: 204.07,
          demandCharge: demandCharge721,
          onPeakDemandCharge: demandCharge721,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge721
        };
      }        
      case '7.2.2': {
        const rateOn722 = 4.3297;
        const rateOff722 = 2.6369;
        const onPeakWhCharge722 = onPeakWh * rateOn722;
        const offPeakWhCharge722 = offPeakWh * rateOff722;
        const whCharge722 = onPeakWhCharge722 + offPeakWhCharge722;
        
      
        const demandRate722 = 210.00; // บาท/kW
        const onPeakDemandKW = onPeakDemandW ; 
        const demandCharge722 = onPeakDemandKW * demandRate722;
        
        const demandVar = row.demandVar || 0; // kVAR
        const demandKW = onPeakDemandKW; // kW
        const pfThreshold = demandKW * 0.6197; // 61.97% ของ kW
        const pfRate = 56.07; // บาท/kVAR - ประกาศนอก if block เพื่อใช้ใน logging
        
        let powerFactorCharge722 = 0;
        if (demandVar > pfThreshold) {
          const excessVar = demandVar - pfThreshold;
          powerFactorCharge722 = Math.round(excessVar * pfRate * 2) / 2; // ปัดเศษขึ้นถ้าเศษ >= 0.5
        }
        
        return {
          whCharge: whCharge722,
          onPeakWhCharge: onPeakWhCharge722,
          offPeakWhCharge: offPeakWhCharge722,
          serviceCharge: 204.07,
          demandCharge: demandCharge722,
          onPeakDemandCharge: demandCharge722,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge722
        };
      }        
      default:
        return {
          whCharge: 0,
          serviceCharge: 0,
          demandCharge: 0,
          powerFactorCharge: 0
        };
    }
  },
  
  // ใช้ไฟล์ 8_temporary_tariff.js สำหรับประเภท 8
  temporaryTariff: (row: ChargeDataRow) => {
    const totalKWh = (row.onPeakKWh || 0) + (row.offPeakKWh || 0);
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    const onPeakDemandW = row.onPeakDemandW || 0;
    const offPeakDemandW = row.offPeakDemandW || 0;
    const rateOn8 = 6.8025;
    const rateOff8 = 6.8025;
    const onPeakWhCharge8 = onPeakWh * rateOn8;
    const offPeakWhCharge8 = offPeakWh * rateOff8;
    const whCharge8 = onPeakWhCharge8 + offPeakWhCharge8;
        
      
    const demandRate8 = 0; 
    const onPeakDemandKW = onPeakDemandW ; 
    const demandCharge8 = onPeakDemandKW * demandRate8;
    const demandKW = onPeakDemandKW; 
    let powerFactorCharge8 = 0;
    return {
          whCharge: whCharge8,
          onPeakWhCharge: onPeakWhCharge8,
          offPeakWhCharge: offPeakWhCharge8,
          serviceCharge: 0,
          demandCharge: demandCharge8,
          onPeakDemandCharge: demandCharge8,
          offPeakDemandCharge: 0,
          powerFactorCharge: powerFactorCharge8
        };
  }
};

// สร้าง mapping สำหรับ charge data columns
const createColumnDataMap = (voltageSelection: Record<string, string>, activeFTValue?: number) => ({
  'Off Peak DmW ': row => {
    if (typeof row.offPeakDemandW === 'number' && !isNaN(row.offPeakDemandW)) {
      return row.offPeakDemandW.toFixed(0);
    }
    return '0';
  },
  'Off Peak Wh': row => {
    if (typeof row.offPeakImportWh === 'number' && !isNaN(row.offPeakImportWh)) {
      return (row.offPeakImportWh / 1000).toLocaleString();
    }
    return '0';
  },
  'On Peak DmW ': row => row.onPeakDemandW ? row.onPeakDemandW.toFixed(0) : '0',
  'On Peak Wh': row => {
    // Debug logging สำหรับ Slave ID 7
    if (row.meterName && row.meterName.includes('7')) {
      console.log(`🔍 On Peak Wh for ${row.meterName}:`, {
        onPeakKWh: row.onPeakKWh,
        type: typeof row.onPeakKWh,
        isNumber: typeof row.onPeakKWh === 'number',
        isZero: row.onPeakKWh === 0,
        isNaN: isNaN(row.onPeakKWh),
        truthyCheck: !!row.onPeakKWh
      });
    }
    
    if (typeof row.onPeakKWh === 'number' && !isNaN(row.onPeakKWh)) {
      return row.onPeakKWh.toLocaleString();
    }
    return '0';
  },
  'Total kWh': row => {
    // Debug logging สำหรับ Slave ID 7
    if (row.meterName && row.meterName.includes('7')) {
      // console.log(`🔍 Total kWh for ${row.meterName}:`, {
      //   totalKWh: row.totalKWh,
      //   type: typeof row.totalKWh,
      //   isNumber: typeof row.totalKWh === 'number',
      //   isZero: row.totalKWh === 0,
      //   isNaN: isNaN(row.totalKWh)
      // });
    }
    
    if (typeof row.totalKWh === 'number' && !isNaN(row.totalKWh)) {
      return row.totalKWh.toLocaleString();
    }
    return '0';
  },
  'Wh Charge': row => {
   
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    
    if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 3
    if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 4
    if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 5
    if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 6
    if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 7
    if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 8
    if (row.class === '8') {
      const result = useCalculatorFile.temporaryTariff(row);
      return parseFloat(result.whCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // คำนวณตามประเภทการคำนวณอื่นๆ
    const onPeakWh = row.onPeakKWh || 0;
    const offPeakWh = row.offPeakKWh || 0;
    
    let onPeakTotal = 0;
    let offPeakTotal = 0;
    
    switch (row.class) {
      default:
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
    }
    
    const total = onPeakTotal + offPeakTotal;
    return parseFloat(total.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  'Demand Charge': row => {
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 1
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 2
    if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 3
    if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 4
    if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 5
    if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 6
    if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 7
    if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 8
    if (row.class === '8') {
      const result = useCalculatorFile.temporaryTariff(row);
      return parseFloat(result.demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // คำนวณ Demand Charge ตาม class ที่เลือก
    const onPeakDmW = row.onPeakDemandW || 0;
    const offPeakDmW = row.offPeakDemandW || 0;
    
    let demandCharge = 0;
    
    // คำนวณตามประเภทการคำนวณ
    switch (row.class) {
      case '7.1':
      case '7.2':
        demandCharge = 0; // ไม่มี demand charge
        break;
      default:
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
    }
    
    return parseFloat(demandCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  'Power Factor': row => {
    // คำนวณ Power Factor Charge จริง
    const powerFactorCharge = calculatePowerFactorCharge(row);
    return parseFloat(powerFactorCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  'Service Charge': row => {
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 1
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 2
    if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 3
    if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 4
    if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 5
    if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 6
    if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 7
    if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
      return result.serviceCharge.toFixed(2);
    }
    
    // ใช้ไฟล์ calculator จริงสำหรับประเภทที่ 8
    if (row.class === '8') {
      const result = useCalculatorFile.temporaryTariff(row);
      return result.serviceCharge.toFixed(2);
    }
    
    // คำนวณ Service Charge ตามประเภทอื่นๆ
    let serviceCharge = 0;
    switch (row.class) {
      default:
        serviceCharge = 38.22;
    }
    
    return serviceCharge.toFixed(2);
  },
  'FT': row => {
    try {

      const onPeakDmW = row.onPeakDemandW || 0;
      const offPeakDmW = row.offPeakDemandW || 0;
      const totalKWh = row.totalKWh || 0;
      
      // ใช้ค่า FT ที่ active อยู่จากหน้า Holiday.tsx แท็บ FT
      const ftRate = activeFTValue || 0.1572; // ใช้ค่า active FT หรือ default
      
     
      if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
  
        const ft = totalKWh * ftRate;
      
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '2.1.1') {

        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '2.1.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '2.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '2.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.1.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.1.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.1.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '3.2.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.1.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.1.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.1.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '4.2.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.1.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.1.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.1.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '5.2.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.1.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.1.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.1.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '6.2.3') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '7.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '7.2.1') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '7.2.2') {
        const ft = totalKWh * ftRate;
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (row.class === '8') {
        const ft = totalKWh * ftRate;
        // console.log(`   - FT = ${ft}`);
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        const ft = ((onPeakDmW + offPeakDmW) + totalKWh) * ftRate;
        // console.log(`   - FT = ${ft}`);
        return parseFloat(ft.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    } catch (error) {

      return '0.00';
    }
  },
  'Total': row => {
    // แสดง log เฉพาะ slave_id = 1
    const shouldShowLog = row.slaveId === 1 || row.slaveId === '1';
    
    if (shouldShowLog) {
      console.log(`💰 === TOTAL CALCULATION START - Slave ID: ${row.slaveId} ===`);
      console.log(`📊 มิเตอร์: ${row.meterName}`);
      console.log(`📊 Class: ${row.class}`);
    }
    
    // คำนวณ Total ตาม class ที่เลือก
    const onPeakDmW = row.onPeakDemandW || 0;
    const offPeakDmW = row.offPeakDemandW || 0;
    const demandVA = row.demandVA || 0;
    
    // ใช้ columnDataMap ที่คำนวณแล้ว - ลบ comma separator ก่อน parseFloat
    const whChargeStr = columnDataMap['Wh Charge'](row);
    const serviceChargeStr = columnDataMap['Service Charge'](row);
    const demandChargeStr = columnDataMap['Demand Charge'](row);
    
    const whCharge = parseFloat(whChargeStr.replace(/,/g, ''));
    const serviceCharge = parseFloat(serviceChargeStr.replace(/,/g, ''));
    const demandCharge = parseFloat(demandChargeStr.replace(/,/g, ''));
    
    if (shouldShowLog) {
      console.log(`🔍 === PARSING COLUMN VALUES ===`);
      console.log(`📊 Wh Charge: "${whChargeStr}" → ${whCharge}`);
      console.log(`🔧 Service Charge: "${serviceChargeStr}" → ${serviceCharge}`);
      console.log(`⚡ Demand Charge: "${demandChargeStr}" → ${demandCharge}`);
    }
    
    // คำนวณ Power Factor Charge จากการคำนวณของแต่ละ class
    let powerFactorCharge = 0;
    
    // ใช้ค่า Power Factor จากการคำนวณของแต่ละ class
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
      powerFactorCharge = result.powerFactorCharge || 0;
    } else if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
      powerFactorCharge = result.powerFactorCharge || 0;
    } else if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
      powerFactorCharge = result.powerFactorCharge || 0;
    } else if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
      powerFactorCharge = result.powerFactorCharge || 0;
    } else {
      // สำหรับ class อื่นๆ ใช้การคำนวณทั่วไป
      powerFactorCharge = calculatePowerFactorCharge(row);
    }
    
    if (shouldShowLog) {
      console.log(`🔋 Power Factor Charge (จาก ${row.class}): ${powerFactorCharge.toFixed(2)}`);
    }
    
    // คำนวณ FT ใช้ค่า FT ที่ active อยู่จากหน้า Holiday.tsx แท็บ FT
    const ftRate = activeFTValue || 0.1572; // ใช้ค่า active FT หรือ default
    
    let ft = 0;
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      ft = row.totalKWh * ftRate; // ประเภท 1.1.1, 1.1.2, 1.1.3.1, 1.1.3.2: FT = Total kWh × FT Rate
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '2.1.1') {
      ft = row.totalKWh * ftRate; // ประเภท 2.1.1: FT = Total kWh × FT Rate
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '2.1.2') {
      ft = row.totalKWh * ftRate; // ประเภท 2.1.2: FT = Total kWh × FT Rate
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '2.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '2.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.1.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.1.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.1.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '3.2.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.1.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.1.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.1.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '4.2.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.1.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.1.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.1.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '5.2.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.1.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.1.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.1.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '6.2.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '7.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '7.2.1') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '7.2.2') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '7.2.3') {
      ft = row.totalKWh * ftRate; 
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else if (row.class === '8') {
      ft = row.totalKWh * ftRate; // ประเภท 8: FT = Total kWh × FT Rate
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ${row.totalKWh} × ${ftRate} = ${ft}`);
      }
    } else {
      ft = ((onPeakDmW + offPeakDmW) + row.totalKWh) * ftRate; // ประเภทอื่น: FT = ((On Peak + Off Peak Demand) + Total kWh) × FT Rate
      if (shouldShowLog) {
        console.log(`   - FT (${row.class}) = ((${onPeakDmW} + ${offPeakDmW}) + ${row.totalKWh}) × ${ftRate} = ${ft}`);
      }
    }
    
    if (shouldShowLog) {
      console.log(`🔢 สูตรการคำนวณ Total สำหรับมิเตอร์ "${row.meterName}" (ประเภท ${row.class}):`);
      console.log(`📊 สูตร: Total = Wh Charge + Service Charge + Demand Charge + Power Factor + FT`);
    }
    
    // แสดงรายละเอียด Wh Charge (On Peak + Off Peak)
    const onPeakKWh = row.onPeakKWh || 0;
    const offPeakKWh = row.offPeakKWh || 0;
    if (shouldShowLog) {
      console.log(`   📈 Wh Charge = ${whCharge} (รวม On Peak ${onPeakKWh} kWh + Off Peak ${offPeakKWh} kWh)`);
    }
    
    // แสดงรายละเอียด Demand Charge (On Peak + Off Peak)
    if (shouldShowLog) {
      console.log(`   ⚡ Demand Charge = ${demandCharge} (รวม On Peak ${onPeakDmW} W + Off Peak ${offPeakDmW} W)`);
    }
    
    // แสดงรายละเอียดอื่นๆ
    if (shouldShowLog) {
      console.log(`   🔧 Service Charge = ${serviceCharge}`);
      console.log(`   🔋 Power Factor Charge = ${powerFactorCharge}`);
      console.log(`   ⛽ FT = ${ft}`);
    }
    
    // คำนวณ Total = Wh Charge + Service Charge + Demand Charge + Power Factor + FT
    const total = whCharge + serviceCharge + demandCharge + powerFactorCharge + ft;
    
    if (shouldShowLog) {
      console.log(`📊 การคำนวณ Total:`);
      console.log(`   Total = Wh Charge + Service Charge + Demand Charge + Power Factor + FT`);
      console.log(`   Total = ${whCharge} + ${serviceCharge} + ${demandCharge} + ${powerFactorCharge} + ${ft}`);
      console.log(`💰 === FINAL TOTAL RESULT ===`);
      console.log(`📊 Total = ${total}`);
      console.log(`📊 Total (formatted) = ${parseFloat(total.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`✅ === TOTAL CALCULATION END ===`);
    }
    
    return parseFloat(total.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  'VAT': row => {
    // คำนวณ VAT จาก Total
    const totalString = columnDataMap['Total'](row).replace(/,/g, '');
    const total = parseFloat(totalString);
    const vat = total * 0.07;
    
    // console.log(`🧾 === VAT CALCULATION ===`);
    // console.log(`📊 มิเตอร์: ${row.meterName}`);
    // console.log(`   - VAT = Total × 0.07`);
    // console.log(`   - VAT = ${total} × 0.07 = ${vat}`);
    
    return parseFloat(vat.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  'Grand Total': row => {
    // คำนวณ Grand Total จาก Total + VAT
    const totalString = columnDataMap['Total'](row).replace(/,/g, '');
    const vatString = columnDataMap['VAT'](row).replace(/,/g, '');
    const total = parseFloat(totalString);
    const vat = parseFloat(vatString);
    const grandTotal = total + vat;
    
    // แสดง log เฉพาะ slave_id = 1
    const shouldShowLog = row.slaveId === 1 || row.slaveId === '1';
    
    if (shouldShowLog) {
      console.log(`🎯 === GRAND TOTAL CALCULATION - Slave ID: ${row.slaveId} ===`);
      console.log(`📊 มิเตอร์: ${row.meterName}`);
      console.log(`   - Grand Total = Total + VAT`);
      console.log(`   - Grand Total = ${total} + ${vat} = ${grandTotal}`);
    }
    
    return parseFloat(grandTotal.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
});

// สร้าง columnDataMap instance เริ่มต้น (จะถูกอัปเดตใน component)
let columnDataMap: Record<string, (row: ChargeDataRow) => string> = createColumnDataMap({}, 0.1572);

// Debug logging for columnDataMap
// console.log('🔍 === COLUMN DATA MAP DEBUG ===');
// console.log('📊 columnDataMap keys:', Object.keys(columnDataMap));
// console.log('📊 columnDataMap[FT]:', columnDataMap['FT']);
// console.log('📊 columnDataMap type:', typeof columnDataMap);
// console.log('✅ === COLUMN DATA MAP DEBUG END ===');

export default function ChargeData() {
    const { language } = useLanguage();
    const { permissions, isAdmin } = usePermissions();
    const [error, setError] = useState<string | null>(null);

  // Function to get calculator file name for selected class
  const getCalculatorFileName = (classValue: string) => {
    const option = classOptions.find(opt => opt.value === classValue);
    return option?.calculator || '1_residential_service';
  };

  // Function to show calculation type info
  const getCalculationTypeInfo = (classValue: string) => {
    const option = classOptions.find(opt => opt.value === classValue);
    if (!option) return '';
    
    if (language === 'TH') {
      return `${option.labelTH} (ใช้ไฟล์: ${option.calculator}.js)`;
    } else {
      return `${option.labelEN} (uses file: ${option.calculator}.js)`;
    }
  };
  
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [tableOrientation, setTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [selectedMeterForCalculation, setSelectedMeterForCalculation] = useState<ChargeDataRow | null>(null);
 
  const [selectedSlaveId, setSelectedSlaveId] = useState<number | null>(null);
  const [selectedMeterInfo, setSelectedMeterInfo] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ChargeDataRow | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [isLoading, setIsLoading] = useState(false);


  const computeChargesForRow = (row: ChargeDataRow) => {
    let result:
      | {
          whCharge: number;
          onPeakWhCharge?: number;
          offPeakWhCharge?: number;
          demandCharge: number;
          onPeakDemandCharge?: number;
          offPeakDemandCharge?: number;
          serviceCharge?: number;
        }
      | undefined;
  
    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
      result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2');
    } else if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
      result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
    } else if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
      result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
    } else if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
      result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
    } else if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
      result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
    } else if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
      result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
    } else if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
      result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
    } else if (row.class === '8') {
      result = useCalculatorFile.temporaryTariff(row);
    }
  
    const onPeakWhCharge = result?.onPeakWhCharge ?? 0;
    const offPeakWhCharge = result?.offPeakWhCharge ?? 0;
    const onPeakDemandCharge = result?.onPeakDemandCharge ?? 0;
    const offPeakDemandCharge = result?.offPeakDemandCharge ?? 0;
  
    // คำนวณ FT
    const totalKWh = row.totalKWh || 0;
    const ftRate = activeFTValue || 0.1572; // ใช้ค่า active FT หรือ default
    const ftValue = totalKWh * ftRate;
  
    // คำนวณ VAT และ Grand Total
    const whCharge = result?.whCharge ?? onPeakWhCharge + offPeakWhCharge;
    const demandCharge = result?.demandCharge ?? onPeakDemandCharge + offPeakDemandCharge;
    const serviceCharge = result?.serviceCharge ?? 0;
    
    const total = whCharge + demandCharge + serviceCharge + ftValue;
    const vat = total * 0.07;
    const grandTotal = total + vat;
  
    return {
      ...row,
      whCharge,
      demandCharge,
      onPeakWhCharge,
      offPeakWhCharge,
      onPeakDemandCharge,
      offPeakDemandCharge,
      serviceCharge,
      ft: ftValue,
      total,
      vat,
      grandTotal,
    };
  };

  // const handleMeterClick = (row: ChargeDataRow) => {
  //   setSelectedMeterForCalculation(row);
  //   setShowCalculationModal(true);
  // };
  const handleMeterClick = (row: ChargeDataRow) => {
    const enhancedRow = computeChargesForRow(row);
    setSelectedMeterForCalculation(enhancedRow);
    setShowCalculationModal(true);
  };

  
  // State for managing charge data
  const [chargeData, setChargeData] = useState<ChargeDataRow[]>([]);
  
  
  // State for demand charge log
  const [activeFTValue, setActiveFTValue] = useState<number | null>(null);
  
  // State for holidays data
  const [holidays, setHolidays] = useState<any[]>([]);
  
  // Function to update meter class
  const updateMeterClass = (meterName: string, newClass: string) => {
    // console.log(`🔄 === UPDATING METER CLASS ===`);
    // console.log(`📊 Meter: ${meterName}`);
    // console.log(`🔧 New Class: ${newClass}`);
    
    setChargeData(prevData => {
      const updatedData = prevData.map(row => {
        if (row.meterName === meterName) {
          // console.log(`✅ Found meter ${meterName}, updating class from ${row.class} to ${newClass}`);
          return { ...row, class: newClass };
        }
        return row;
      });
      
      // console.log(`📊 Updated charge data:`, updatedData.map(row => ({ 
      //   meterName: row.meterName, 
      //   class: row.class 
      // })));
      
      return updatedData;
    });
    
    // console.log(`✅ === METER CLASS UPDATE COMPLETE ===`);
  };
  
  // Function to get class label from class value
  const getClassLabel = (classValue: string) => {
    const option = classOptions.find(opt => opt.value === classValue);
    return option ? (language === 'TH' ? option.labelTH : option.labelEN) : classValue;
  };
  
  // Function to fetch active FT configuration
  const fetchActiveFTConfig = useCallback(async () => {
    try {
      // console.log('🚀 === FETCHING ACTIVE FT CONFIG ===');
      
      // Get current year
      const currentYear = new Date().getFullYear();
      // console.log(`📅 Current year: ${currentYear}`);
      
      // Fetch FT configs for current year using ftConfigService
      const response = await ftConfigService.getFTConfigsByYear(currentYear);
      
      // console.log('📊 FT Config Service Response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        // console.log(`📊 Found ${response.data.length} FT configs for year ${currentYear}`);
        
        // Find active FT config
        const activeFT = response.data.find((ft: any) => ft.is_active === true);
        if (activeFT) {
          // // console.log('✅ Active FT found:', {
          //   id: activeFT.id,
          //   name: activeFT.name,
          //   value: activeFT.value,
          //   description: activeFT.description,
          //   is_active: activeFT.is_active,
          //   start_month: activeFT.start_month,
          //   end_month: activeFT.end_month,
          //   start_day: activeFT.start_day,
          //   end_day: activeFT.end_day
          // });
          setActiveFTValue(activeFT.value);
          // console.log(`🔧 Set active FT value to: ${activeFT.value}`);
        } else {
          // console.log('⚠️ No active FT found in configs, using default value 0.1572');
          // // console.log('📊 Available FT configs:', response.data.map((ft: any) => ({
          //   id: ft.id,
          //   name: ft.name,
          //   value: ft.value,
          //   is_active: ft.is_active
          // })));
          setActiveFTValue(0.1572); // Default value
        }
      } else {
        // console.log('⚠️ No FT config data found, using default value 0.1572');
        setActiveFTValue(0.1572); // Default value
      }
    } catch (error) {
      // console.error('❌ Error fetching FT config:', error);
      setActiveFTValue(0.1572); // Default value on error
    }
    console.log('✅ === FETCHING ACTIVE FT CONFIG COMPLETE ===');
  }, []);

  // Function to calculate FT value for a row
  const calculateFTValue = (row: ChargeDataRow) => {
    const onPeakDmW = row.onPeakDemandW;
    const offPeakDmW = row.offPeakDemandW;
    const totalKWh = row.totalKWh;
    return ((onPeakDmW + offPeakDmW) + totalKWh) * 0.1572;
  };

  // Function to get short class display (for table column)
  const getShortClassDisplay = (classValue: string) => {
    const option = classOptions.find(opt => opt.value === classValue);
    if (!option) return classValue;
    
    if (language === 'TH') {
      // For Thai, show short format for new calculation types
      const shortLabelsTH: Record<string, string> = {
        "1.1.1": "1.1.1 (ทั่วไป)",
        "1.1.2": "1.1.2 (TOU)",
        "1.1.3.1": "1.1.3.1 (TOU)",
        "1.1.3.2": "1.1.3.2 (TOU)",
        "2.1.1": "2.1.1 (ทั่วไป)",
        "2.1.2": "2.1.2 (ทั่วไป)",
        "2.2.1": "2.2.1 (TOU)",
        "2.2.2": "2.2.2 (TOU)",
        "3.1.1": "3.1.1 (ทั่วไป)",
        "3.1.2": "3.1.2 (ทั่วไป)",
        "3.1.3": "3.1.3 (ทั่วไป)",
        "3.2.1": "3.2.1 (TOU)",
        "3.2.2": "3.2.2 (TOU)",
        "3.2.3": "3.2.3 (TOU)",
        "4.1.1": "4.1.1 (TOD)",
        "4.1.2": "4.1.2 (TOD)",
        "4.1.3": "4.1.3 (TOD)",
        "4.2.1": "4.2.1 (TOU)",
        "4.2.2": "4.2.2 (TOU)",
        "4.2.3": "4.2.3 (TOU)",
        "5.1.1": "5.1.1 (ทั่วไป)",
        "5.1.2": "5.1.2 (ทั่วไป)",
        "5.1.3": "5.1.3 (ทั่วไป)",
        "5.2.1": "5.2.1 (TOU)",
        "5.2.2": "5.2.2 (TOU)",
        "5.2.3": "5.2.3 (TOU)",
        "6.1.1": "6.1.1 (ทั่วไป)",
        "6.1.2": "6.1.2 (ทั่วไป)",
        "6.1.3": "6.1.3 (ทั่วไป)",
        "6.2.1": "6.2.1 (TOU)",
        "6.2.2": "6.2.2 (TOU)",
        "6.2.3": "6.2.3 (TOU)",
        "7.1": "7.1 (ทั่วไป)",
        "7.2.1": "7.2.1 (TOU)",
        "7.2.2": "7.2.2 (TOU)",
        "8": "8 (ชั่วคราว)"
      };
      return shortLabelsTH[classValue] || classValue;
    } else {
      // For English, show short format for new calculation types
      const shortLabels: Record<string, string> = {
        "1.1.1": "1.1.1 (Normal)",
        "1.1.2": "1.1.2 (TOU)",
        "1.1.3.1": "1.1.3.1 (TOU)",
        "1.1.3.2": "1.1.3.2 (TOU)",
        "2.1.1": "2.1.1 (Normal)",
        "2.1.2": "2.1.2 (Normal)",
        "2.2.1": "2.2.1 (TOU)",
        "2.2.2": "2.2.2 (TOU)",
        "3.1.1": "3.1.1 (Normal)",
        "3.1.2": "3.1.2 (Normal)",
        "3.1.3": "3.1.3 (Normal)",
        "3.2.1": "3.2.1 (TOU)",
        "3.2.2": "3.2.2 (TOU)",
        "3.2.3": "3.2.3 (TOU)",
        "4.1.1": "4.1.1 (TOD)",
        "4.1.2": "4.1.2 (TOD)",
        "4.1.3": "4.1.3 (TOD)",
        "4.2.1": "4.2.1 (TOU)",
        "4.2.2": "4.2.2 (TOU)",
        "4.2.3": "4.2.3 (TOU)",
        "5.1.1": "5.1.1 (Normal)",
        "5.1.2": "5.1.2 (Normal)",
        "5.1.3": "5.1.3 (Normal)",
        "5.2.1": "5.2.1 (TOU)",
        "5.2.2": "5.2.2 (TOU)",
        "5.2.3": "5.2.3 (TOU)",
        "6.1.1": "6.1.1 (Normal)",
        "6.1.2": "6.1.2 (Normal)",
        "6.1.3": "6.1.3 (Normal)",
        "6.2.1": "6.2.1 (TOU)",
        "6.2.2": "6.2.2 (TOU)",
        "6.2.3": "6.2.3 (TOU)",
        "7.1": "7.1 (Normal)",
        "7.2.1": "7.2.1 (TOU)",
        "7.2.2": "7.2.2 (TOU)",
        "8": "8 (Temporary)"
      };
      return shortLabels[classValue] || classValue;
    }
  };
  
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [exportType, setExportType] = useState<'pdf' | 'csv' | 'image'>('pdf');
  const meterTreeData = useMeterTree();
  const { selectedNodeId, rootNodes, selectedSlaveIds, buildingNodes, systemNodes } = meterTreeData;
  
  // ใช้ buildingNodes เป็นหลัก ถ้าไม่มีให้ใช้ systemNodes
  const treeData = buildingNodes && buildingNodes.length > 0 ? buildingNodes : systemNodes;
  
  // ฟังก์ชันดึงชื่อมิเตอร์ทั้งหมดจาก tree (iconType === 'meter') พร้อม location
  function getAllMetersFromTree(nodes: any[], parentPath = '') {
    let meters: any[] = [];
    if (!nodes || !Array.isArray(nodes)) return meters;
    
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      if (node.iconType === 'meter' && node.name) {
        meters.push({ 
          id: node.id, 
          name: node.name,
          location: parentPath || 'Root',
          slave_id: node.slave_id
        });
      }
      if (node.children) {
        meters = meters.concat(getAllMetersFromTree(node.children, currentPath));
      }
    }
    return meters;
  }
  
  const meterList = getAllMetersFromTree(treeData || []);
  
  
  // Debug: ตรวจสอบว่า useMeterTree ทำงานหรือไม่
  // if (!meterTreeData) {
  //   console.error('❌ useMeterTree hook returned null/undefined');
  // }
  
  // if (!selectedNodeId && !rootNodes) {
  //   console.log('⚠️ useMeterTree hook not yet initialized');
  // }

  // Function to fetch holidays data
  const fetchHolidays = useCallback(async () => {
    try {
      const holidayResponse = await apiClient.getHolidays();
      if (holidayResponse.success && holidayResponse.data) {
        setHolidays(holidayResponse.data);
        console.log(`🎉 Loaded ${holidayResponse.data.length} holidays`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load holidays:', error);
      setHolidays([]); // ใช้ array ว่างถ้าดึงข้อมูลไม่ได้
    }
  }, []);

  // Fetch active FT configuration and holidays when component mounts
  useEffect(() => {
    fetchActiveFTConfig();
    fetchHolidays();
  }, []); // เรียกเฉพาะครั้งแรกที่ mount

  // Update columnDataMap when activeFTValue changes
  useEffect(() => {
    // console.log('🔄 === UPDATING COLUMN DATA MAP ===');
    // console.log(`📊 Active FT Value: ${activeFTValue}`);
    columnDataMap = createColumnDataMap({}, activeFTValue || 0.1572);
    // console.log('✅ Column data map updated with new FT value');
  }, [activeFTValue]);

  // Load sample data and create meter info when meter is selected
  useEffect(() => {
    if (selectedNodeId && selectedNodeId.startsWith('meter-')) {
      // console.log('🚀 Meter selected, creating meter info and loading sample data...');
      
      // สร้างข้อมูลมิเตอร์ทันที
      const meterId = selectedNodeId.replace('meter-', '');
      const meterInfo = {
        id: selectedNodeId,
        name: `Meter ${meterId}`,
        slave_id: parseInt(meterId) || 1, // ใช้ meter ID เป็น slave_id
        meter_class: '3.1.1',
        type: 'meter',
        location: 'Unknown',
        building: 'Unknown',
        floor: 'Unknown'
      };
      
      // console.log('✅ Created meter info:', meterInfo);
      setSelectedMeterInfo(meterInfo);
      setSelectedSlaveId(meterInfo.slave_id);
      
      // โหลดข้อมูล charge จาก API ทันที (ไม่ต้องเรียกที่นี่ เพราะจะโหลดซ้ำ)
      // if (dateFrom && dateTo) {
      //   loadChargeData();
      // }
      
      // console.log('🚀 Sample data loaded, meter info created, error cleared');
    }
  }, [selectedNodeId]);

  // Debug: แสดงข้อมูล useMeterTree เฉพาะเมื่อจำเป็น
  if (process.env.NODE_ENV === 'development') {
    // console.log('🔍 === USE METER TREE DEBUG ===');
    // console.log('🔍 selectedNodeId:', selectedNodeId);
    // console.log('🔍 selectedNodeId type:', typeof selectedNodeId);
    // console.log('🔍 selectedNodeId is meter:', selectedNodeId?.startsWith('meter-'));
    // console.log('🌳 rootNodes available:', rootNodes ? 'YES' : 'NO');
    // console.log('🌳 rootNodes length:', rootNodes?.length);
    // console.log('🔍 meterList length:', meterList?.length);
    // console.log('🔍 dateFrom:', dateFrom);
    // console.log('🔍 dateTo:', dateTo);
    // console.log('🔍 isLoading:', isLoading);
    // console.log('🔍 isLoaded:', isLoaded);
    
    // ตรวจสอบสถานะปุ่ม
    const loadButtonDisabled = isLoading || !dateFrom || !dateTo || !meterList || meterList.length === 0;
    const navigationDisabled = isLoading || !dateFrom || !dateTo || !meterList || meterList.length === 0;
    // console.log('🔴 Load Button Disabled:', loadButtonDisabled);
    // console.log('🔴 Navigation Disabled:', navigationDisabled);
    // console.log('================================');
  }
  
  // ลบ debug useEffect ที่ไม่จำเป็นเพื่อลด re-render

  // Fetch email/line groups and users for print modal - ลบ debug logs
  useEffect(() => {
    
    // If there's already a selected meter on mount, load charge data (ไม่ต้องเรียกที่นี่ เพราะจะโหลดซ้ำ)
    // if (selectedNodeId && selectedNodeId.startsWith('meter-') && meterList && meterList.length > 0 && dateFrom && dateTo) {
    //   console.log('🔢 Initial meter selected on mount, loading charge data...');
    //   loadChargeData();
    // }
    
    const fetchGroups = async () => {
      try {
        // Fetch email groups
        const emailGroupsResponse = await apiClient.getEmailGroups();
        setEmailGroups(emailGroupsResponse.data || []);

        // Fetch line groups
        const lineGroupsResponse = await apiClient.getLineGroups();
        setLineGroups(lineGroupsResponse.data || []);

        // Fetch all users for email list
        const allUsersResponse = await apiClient.getUsers();
        const emailUsers = allUsersResponse.data?.filter((user: any) => user.enabled && user.email) || [];
        setEmailList(emailUsers);

        // Fetch all users for line list
        const lineUsers = allUsersResponse.data?.filter((user: any) => user.enabled && user.lineId) || [];
        setLineList(lineUsers);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, []);
    
  // Modal state for export type selection
  const [showExportModal, setShowExportModal] = useState(false);

  // Date navigation hook
  const { dateRange, navigateDate, setDateRangeManually } = useDateNavigation();
  
  // Print modal states
  const [emailGroups, setEmailGroups] = useState<{ id: number; name: string }[]>([]);
  const [lineGroups, setLineGroups] = useState<{ id: number; name: string }[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Export handler
  async function handleExport(type: 'pdf' | 'csv' | 'image') {
    // Get current date in DDMMYYYY format
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileDate = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
    const baseName = `Charge-${fileDate}`;
    
    if (type === 'pdf') {
      // Export as PDF
      const table = document.querySelector('table');
      if (!table) return;
      const canvas = await html2canvas(table as HTMLElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight > pageHeight-40 ? pageHeight-40 : imgHeight);
      pdf.save(`${baseName}.pdf`);
    } else if (type === 'csv') {
      // Export as CSV
      let csv = '';
      const table = document.querySelector('table');
      if (!table) return;
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cols = row.querySelectorAll('th,td');
        const rowData = Array.from(cols).map(col => '"' + col.textContent?.replace(/"/g, '""') + '"').join(',');
        csv += rowData + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (type === 'image') {
      // Export as Image
      const table = document.querySelector('table');
      if (!table) return;
      const canvas = await html2canvas(table as HTMLElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // Date navigation handler
  const handleDateNavigation = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!dateFrom || !dateTo) return;
    
    const newDateFrom = new Date(dateFrom);
    const newDateTo = new Date(dateTo);
    
    switch (direction) {
      case 'left': // Previous day
        newDateFrom.setDate(newDateFrom.getDate() - 1);
        newDateTo.setDate(newDateTo.getDate() - 1);
        break;
      case 'right': // Next day
        newDateFrom.setDate(newDateFrom.getDate() + 1);
        newDateTo.setDate(newDateTo.getDate() + 1);
        break;
      case 'up': // Next month
        newDateFrom.setMonth(newDateFrom.getMonth() + 1);
        newDateTo.setMonth(newDateTo.getMonth() + 1);
        break;
      case 'down': // Previous month
        newDateFrom.setMonth(newDateFrom.getMonth() - 1);
        newDateTo.setMonth(newDateTo.getMonth() - 1);
        break;
    }
    
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
    setIsLoaded(false);
  };

  // Send report handler
  async function handleSendReport(payload: {
    type: 'email' | 'line';
    exportType?: 'pdf' | 'csv' | 'image' | 'text';
    emailListId?: number;
    emailGroupId?: number;
    lineListId?: number;
    lineGroupId?: number;
  }) {
    setIsSending(true);
    try {
      // Create report data
      const reportData = {
        type: 'charge',
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : '',
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : '',
        timeFrom,
        timeTo,
        tableOrientation,
        meterCount: filteredData ? filteredData.length : 0,
        totalGrandTotal: filteredData ? filteredData.reduce((sum, row) => sum + row.grandTotal, 0) : 0,
        ...payload
      };

      // Send report logic here
      // console.log('Sending report:', reportData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`ส่งรายงานเรียบร้อยแล้ว`);
    } catch (error) {
      // console.error('Error sending report:', error);
      alert('เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setIsSending(false);
    }
  }


  const toggleViewMode = () => {
          if (!isLoaded || !filteredData || filteredData.length === 0) {
      alert('กรุณาโหลดข้อมูลก่อนแสดงกราф');
      return;
    }
    setViewMode(viewMode === 'table' ? 'graph' : 'table');
  };


  // ฟังก์ชันค้นหา node ที่เลือกใน tree
  function findNodeById(nodes, id) {
    // ตรวจสอบว่า nodes เป็น array หรือไม่
    if (!nodes || !Array.isArray(nodes)) {
      // console.log('🚀 === FIND NODE BY ID ERROR ===');
      // console.log(`🚀 nodes is not iterable:`, nodes);
      // console.log(`🚀 nodes type:`, typeof nodes);
      // console.log(`🚀 nodes is array:`, Array.isArray(nodes));
      // console.log('================================');
      return null;
    }
    
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // สร้างข้อมูลมิเตอร์จากมิเตอร์ทั้งหมดที่มีอยู่
  let filteredData = chargeData;
  
  // แสดงมิเตอร์ทั้งหมดที่มีอยู่ในระบบ (ข้อมูลจะถูกโหลดจากฐานข้อมูล)
  if (meterList.length > 0 && chargeData.length === 0) {
    const meterData: ChargeDataRow[] = meterList.map((meter, index) => {
      // สร้างข้อมูลเริ่มต้นสำหรับแต่ละมิเตอร์ (จะถูกแทนที่ด้วยข้อมูลจริงจากฐานข้อมูล)
      return {
        meterName: meter.name,
        slaveId: meter.slave_id, // เพิ่ม slaveId สำหรับการ filter log
        class: '1.1.1', // ค่าเริ่มต้น
        onPeakDemandW: 0,
        offPeakDemandW: 0,
        onPeakImportWh: 0,
        offPeakImportWh: 0,
        demandVar: 0,
        demandVA: 0,
        importKWh: 0,
        powerFactorTotal: 0,
        offPeakKWh: 0,
        onPeakKWh: 0,
        totalKWh: 0,
        whCharge: null,
        onPeakWhCharge: null,
        offPeakWhCharge: null,
        demandCharge: null,
        onPeakDemandCharge: null,
        offPeakDemandCharge: null,
        serviceCharge: null,
        ft: 0.1572,
        surcharge: null,
        total: null,
        vat: null,
        grandTotal: null
      };
    });
    
    // console.log('🔍 === SAMPLE METER DATA WITH POWER FACTOR ===');
    meterData.forEach(meter => {
      // console.log(`📊 ${meter.meterName}:`);
      // console.log(`   - onPeakDemandW: ${meter.onPeakDemandW} kW`);
      // console.log(`   - offPeakDemandW: ${meter.offPeakDemandW} kW`);
      // console.log(`   - demandVar: ${meter.demandVar} kvar`);
      // console.log(`   - demandVA: ${meter.demandVA} kVA`);
      // console.log(`   - powerFactorTotal: ${meter.powerFactorTotal}`);
      
      // ทดสอบการคำนวณ Power Factor Charge
      const pfCharge = calculatePowerFactorCharge(meter);
      console.log(`   - Power Factor Charge: ${pfCharge.toFixed(2)} บาท`);
    });
    
    filteredData = meterData;
  }

  // Debug logging for filteredData
  // console.log('🔍 === FILTERED DATA DEBUG ===');
  // console.log('📊 chargeData length:', chargeData.length);
  // console.log('📊 filteredData length:', filteredData.length);
  // console.log('📊 selectedNodeId:', selectedNodeId);
  // console.log('📊 rootNodes:', rootNodes);
  if (filteredData.length > 0) {
    // console.log('📊 First filteredData row:', filteredData[0]);
    // console.log('📊 First row keys:', Object.keys(filteredData[0]));
  }
  // console.log('✅ === FILTERED DATA DEBUG END ===');

  // ฟังก์ชันคำนวณตามประเภทการคำนวณและไฟล์ calculator
  const calculateValues = (row: ChargeDataRow) => {
    const onPeakDmW = row.onPeakDemandW;
    const offPeakDmW = row.offPeakDemandW;
    const onPeakWh = row.onPeakKWh;
    const offPeakWh = row.offPeakKWh;
    
    // หาไฟล์ calculator ที่เหมาะสมตามประเภท
    const classOption = classOptions.find(opt => opt.value === row.class);
    const calculatorFile = classOption?.calculator || '1_residential_service';
    
    // คำนวณตามประเภทการคำนวณ
    let onPeakTotal = 0;
    let offPeakTotal = 0;
    let totalKWh = 0;
    let demandCharge = 0;
    let powerFactor = 0;
    let powerFactorCharge = 0;
    let ft = 0;
    
    // คำนวณตามประเภท
    switch (row.class) {
      case '1.1.1':
        // Residential Service - Progressive Rate
        const totalKWh111 = onPeakWh + offPeakWh;
        let whCharge111 = 0;
        let remainingKWh111 = totalKWh111;
        
        // ขั้นที่ 1: 150 หน่วยแรก (0-150)
        if (remainingKWh111 > 0) {
          const tier1KWh = Math.min(remainingKWh111, 150);
          const tier1Charge = tier1KWh * 2.3488;
          whCharge111 += tier1Charge;
          remainingKWh111 -= tier1KWh;
        }
        
        // ขั้นที่ 2: 250 หน่วยต่อไป (151-400)
        if (remainingKWh111 > 0) {
          const tier2KWh = Math.min(remainingKWh111, 250);
          const tier2Charge = tier2KWh * 2.9882;
          whCharge111 += tier2Charge;
          remainingKWh111 -= tier2KWh;
        }
        
        // ขั้นที่ 3: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingKWh111 > 0) {
          const tier3Charge = remainingKWh111 * 3.2484;
          whCharge111 += tier3Charge;
        }
        
        onPeakTotal = whCharge111 * (onPeakWh / totalKWh111);
        offPeakTotal = whCharge111 * (offPeakWh / totalKWh111);
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 0; // ไม่มี demand charge สำหรับ residential
        break;
        
      case '1.1.2':
        // Residential Service - Progressive Rate (Different rates)
        const totalKWh112 = onPeakWh + offPeakWh;
        let whCharge112 = 0;
        let remainingKWh112 = totalKWh112;
        
        // ขั้นที่ 1: 150 หน่วยแรก (0-150)
        if (remainingKWh112 > 0) {
          const tier1KWh = Math.min(remainingKWh112, 150);
          const tier1Charge = tier1KWh * 3.2484;
          whCharge112 += tier1Charge;
          remainingKWh112 -= tier1KWh;
        }
        
        // ขั้นที่ 2: 250 หน่วยต่อไป (151-400)
        if (remainingKWh112 > 0) {
          const tier2KWh = Math.min(remainingKWh112, 250);
          const tier2Charge = tier2KWh * 4.2218;
          whCharge112 += tier2Charge;
          remainingKWh112 -= tier2KWh;
        }
        
        // ขั้นที่ 3: เกิน 400 หน่วยขึ้นไป (401+)
        if (remainingKWh112 > 0) {
          const tier3Charge = remainingKWh112 * 4.4217;
          whCharge112 += tier3Charge;
        }
        
        onPeakTotal = whCharge112 * (onPeakWh / totalKWh112);
        offPeakTotal = whCharge112 * (offPeakWh / totalKWh112);
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 0; // ไม่มี demand charge สำหรับ residential
        break;
        
      case '1.1.3.1':
        // Residential Service - TOU Rate (1.1.3.1)
        // ใช้แรงดันต่ำกว่า 22 kV (Volt 2) เป็นค่าเริ่มต้น
        const volt1131 = "2";
        const rateOn1131 = 5.7982; // Volt 2: แรงดันต่ำกว่า 22 kV
        const rateOff1131 = 2.6369; // Volt 2: แรงดันต่ำกว่า 22 kV
        onPeakTotal = onPeakWh * rateOn1131;
        offPeakTotal = offPeakWh * rateOff1131;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 0; // ไม่มี demand charge สำหรับ residential
        break;
        
      case '1.1.3.2':
        // Residential Service - TOU Rate (1.1.3.2)
        // ใช้แรงดันต่ำกว่า 22 kV (Volt 2) เป็นค่าเริ่มต้น
        const volt1132 = "2";
        const rateOn1132 = 5.7982; // Volt 2: แรงดันต่ำกว่า 22 kV
        const rateOff1132 = 2.6369; // Volt 2: แรงดันต่ำกว่า 22 kV
        onPeakTotal = onPeakWh * rateOn1132;
        offPeakTotal = offPeakWh * rateOff1132;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 0; // ไม่มี demand charge สำหรับ residential
        break;
        
      case '2.1.1':
      case '2.1.2':
      case '2.2.1':
      case '2.2.2':
        // Small General Service - ใช้ไฟล์ 2_small_general_service.js
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
        break;
        
      case '3.1.1':
      case '3.1.2':
      case '3.1.3':
      case '3.2.1':
      case '3.2.2':
      case '3.2.3':
        // Medium General Service - ใช้ไฟล์ 3_medium_general_service.js
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
        break;
        
      case '4.1.1':
      case '4.1.2':
      case '4.1.3':
      case '4.2.1':
      case '4.2.2':
      case '4.2.3':
        // Large General Service - ใช้ไฟล์ 4_large_general_service.js
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
        break;
        
      case '5.1.1':
      case '5.1.2':
      case '5.1.3':
      case '5.2.1':
      case '5.2.2':
      case '5.2.3':
        // Specific Business Service - ใช้ไฟล์ 5_specific_business_service.js
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
        break;
        
      case '6.1.1':
      case '6.1.2':
      case '6.1.3':
      case '6.2.1':
      case '6.2.2':
      case '6.2.3':
        // Government/Non-Profit - ใช้ไฟล์ 6_gov_nonprofit_org.js
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
        break;
        
      case '7.1':
      case '7.2.1':
      case '7.2.2':
        // Water Pumping/Agricultural - ใช้ไฟล์ 7_water_pumping_agricultural.js
        onPeakTotal = onPeakWh * 2.9882;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 0; // ไม่มี demand charge สำหรับเกษตรกรรม
        break;
        
      case '8':
        // Temporary Tariff - ใช้ไฟล์ 8_temporary_tariff.js
        const rate8 = 6.8025;
        onPeakTotal = onPeakWh * rate8;
        offPeakTotal = offPeakWh * rate8;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = 0; 
        break;
        
      default:
        // Default calculation
        onPeakTotal = onPeakWh * 4.1839;
        offPeakTotal = offPeakWh * 2.6037;
        totalKWh = onPeakTotal + offPeakTotal;
        demandCharge = (onPeakDmW + offPeakDmW) * 132.93;
    }
    
    // คำนวณ Power Factor
    powerFactor = row.demandVA / (onPeakDmW + offPeakDmW);
    powerFactorCharge = calculatePowerFactorCharge(row);
    
   
    
    // คำนวณ Total
    const total = totalKWh + demandCharge + powerFactorCharge;
    
    // คำนวณ VAT
    const vat = (total - ft) * 0.07;
    
    // คำนวณ Grand Total
    const grandTotal = vat + (total - ft);
    
    return {
      onPeakDmW,
      offPeakDmW,
      onPeakWh,
      offPeakWh,
      onPeakTotal,
      offPeakTotal,
      totalKWh,
      demandCharge,
      powerFactor,
      powerFactorCharge,
      total,
      ft,
      vat,
      grandTotal,
      onPeakWhCharge: onPeakTotal,
      offPeakWhCharge: offPeakTotal,
      onPeakDemandCharge: demandCharge, 
      offPeakDemandCharge: demandCharge ,
      serviceCharge: 0 // จะถูกคำนวณในแต่ละประเภท
    };
  };

  // ตั้งค่า default date/time: from = วันนี้ เวลา 00:00, to = วันนี้ เวลา ณ ปัจจุบัน
  useEffect(() => {
    if (!dateFrom) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      setDateFrom(todayStart);
      setTimeFrom('00:00');
    }
    if (!dateTo) {
      const now = new Date();
      setDateTo(now);
      // Format current time as HH:mm
      const pad = (n) => n.toString().padStart(2, '0');
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      setTimeTo(`${hh}:${mm}`);
    }
  }, []);

  // Reset isLoaded เมื่อมีการเปลี่ยน filter
  useEffect(() => {
    setIsLoaded(false);
  }, [dateFrom, dateTo, timeFrom, timeTo]);

  // Function to fetch charge data using TableData API (เหมือน TableData.tsx)
  const fetchChargeDataFromAPI = async (
    slaveIds: number[],
    dateFrom: Date,
    dateTo: Date,
    timeFrom: string,
    timeTo: string,
    meterList: any[]
  ): Promise<ChargeDataRow[]> => {
    try {
      
      // ดึงข้อมูลวันหยุดจากฐานข้อมูล
      let holidays: any[] = [];
      try {
        const holidayResponse = await apiClient.getHolidays();
        if (holidayResponse.success && holidayResponse.data) {
          holidays = holidayResponse.data;
        }
      } catch (error) {
        // ใช้งานต่อไปโดยไม่มีข้อมูลวันหยุด
      }
      
      // ใช้ getTableData เหมือน TableData.tsx แทน getChargeData
      const params = {
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        columns: ['Demand W', 'Import kWh', 'Demand Var'], // เพิ่ม Demand Var สำหรับการคำนวณ Power Factor
        slaveIds: slaveIds
      };
      
      const response = await apiClient.getTableData(params);
      
      if (response.success && response.data) {
        // response.data เป็น array ของ records
        const records = Array.isArray(response.data) ? response.data : [];
        
        // Group data by slave_id and separate Peak/Off Peak periods
        const meterDataMap = new Map<number, { 
          peakDemandW: number, 
          partialDemandW?: number, // สำหรับ TOD
          offPeakDemandW: number,
          maxDemandVar: number, // เพิ่ม maxDemandVar ใน type definition
          totalKWh?: number, // สำหรับ TOD
          peakImportKWh: number, 
          offPeakImportKWh: number,
          records: any[] 
        }>();
        
        // Group records by slave_id first
        const recordsByMeter = new Map<number, any[]>();
        records.forEach((record: any) => {
          const slaveId = record.slave_id;
          if (!recordsByMeter.has(slaveId)) {
            recordsByMeter.set(slaveId, []);
          }
          recordsByMeter.get(slaveId)!.push(record);
        });
        
        // Process each meter's records with Peak/Off Peak separation
        recordsByMeter.forEach((meterRecords, slaveId) => {
          console.log(`📊 Processing meter ${slaveId} with ${meterRecords.length} records...`);
          
          try {
            // ตรวจสอบว่ามีการเลือก class 4.1.1 หรือไม่ (จาก existing data)
            const meter = meterList.find(m => parseInt(m.slave_id) === slaveId);
            const meterName = meter?.name || `Meter ${slaveId}`;
            const existingRow = chargeData.find(row => row.meterName === meterName);
            const selectedClass = existingRow?.class || '1.1.1';
            
            let processedData;
            
            if (selectedClass === '4.1.1') {
              // ใช้ TOD separation สำหรับประเภท 4.1.1
              console.log(`🕐 Using TOD separation for meter ${slaveId} (Class 4.1.1)`);
              console.log(`📊 Meter Records for TOD:`, {
                slaveId: slaveId,
                recordsCount: meterRecords.length,
                firstRecord: meterRecords[0],
                lastRecord: meterRecords[meterRecords.length - 1]
              });
              
              const todData = separateTODData(meterRecords);
              
              processedData = {
                peakDemandW: todData.peakDemandW,
                partialDemandW: todData.partialDemandW,
                offPeakDemandW: todData.offPeakDemandW,
                maxDemandVar: todData.maxDemandVar,
                totalKWh: todData.totalKWh,
                // เก็บ compatibility กับ TOU fields
                peakImportKWh: todData.totalKWh, // ใช้ total kWh สำหรับ 4.1.1
                offPeakImportKWh: 0,
                records: meterRecords
              };
            } else {
              // ใช้ TOU separation สำหรับประเภทอื่นๆ
              console.log(`🕰️ Using TOU separation for meter ${slaveId} (Class ${selectedClass})`);
              console.log(`⚠️ หมายเหตุ: ไม่ใช้ TOD เพราะ class ไม่ใช่ 4.1.1!`);
              const peakOffPeakData = separatePeakOffPeakData(meterRecords, holidays, { from: dateFrom, to: dateTo });
              
              processedData = {
                peakDemandW: peakOffPeakData.peakDemandW,
                partialDemandW: 0, // TOU ไม่มี partial
                offPeakDemandW: peakOffPeakData.offPeakDemandW,
                maxDemandVar: peakOffPeakData.maxDemandVar,
                totalKWh: (peakOffPeakData.peakImportKWh || 0) + (peakOffPeakData.offPeakImportKWh || 0),
                peakImportKWh: peakOffPeakData.peakImportKWh,
                offPeakImportKWh: peakOffPeakData.offPeakImportKWh,
                records: meterRecords
              };
              
              console.log(`📊 TOU Results:`, {
                peakDemandW: processedData.peakDemandW,
                partialDemandW: processedData.partialDemandW,
                offPeakDemandW: processedData.offPeakDemandW,
                totalKWh: processedData.totalKWh
              });
            }
            
            meterDataMap.set(slaveId, processedData);
            
            // console.log(`✅ Meter ${slaveId} processed:`, {
            //   peakDemandW: peakOffPeakData.peakDemandW,
            //   offPeakDemandW: peakOffPeakData.offPeakDemandW,
            //   peakImportKWh: peakOffPeakData.peakImportKWh,
            //   offPeakImportKWh: peakOffPeakData.offPeakImportKWh,
            //   totalPeakRecords: peakOffPeakData.totalPeakRecords,
            //   totalOffPeakRecords: peakOffPeakData.totalOffPeakRecords
            // });
          } catch (error) {
            // console.error(`❌ Error processing Peak/Off Peak data for meter ${slaveId}:`, error);
            // ใช้ค่า fallback เมื่อเกิด error
            const maxDemandW = Math.max(...meterRecords.map(r => parseFloat(r['Demand W']) || 0));
            const maxImportKWh = Math.max(...meterRecords.map(r => parseFloat(r['Import kWh']) || 0));
            const maxDemandVar = Math.max(...meterRecords.map(r => parseFloat(r['Demand Var']) || 0));
            
            meterDataMap.set(slaveId, {
              peakDemandW: maxDemandW,
              offPeakDemandW: 0,
              maxDemandVar: maxDemandVar, // เพิ่ม maxDemandVar สำหรับ fallback
              peakImportKWh: maxImportKWh,
              offPeakImportKWh: 0,
              records: meterRecords
            });
            
            // console.log(`⚠️ Meter ${slaveId} fallback values:`, {
            //   peakDemandW: maxDemandW,
            //   peakImportKWh: maxImportKWh
            // });
          }
        });
        
        console.log(`📊 Processed data for ${meterDataMap.size} meters`);
        console.log('📊 Meters with data in database:', Array.from(meterDataMap.keys()));
        console.log(`📊 Total meters in list: ${meterList.length}, meters with data: ${meterDataMap.size}`);
        
        const chargeDataRows: ChargeDataRow[] = [];
        
        // Create charge data สำหรับมิเตอร์ทุกตัวในรายการ (ไม่ว่าจะมีข้อมูลหรือไม่)
        meterList.forEach((meter) => {
          const slaveId = parseInt(meter.slave_id);
          const data = meterDataMap.get(slaveId);
          
          if (data) {
            // มิเตอร์ที่มีข้อมูลในฐานข้อมูล - ใช้ข้อมูลจริง
            console.log(`🏢 Creating ChargeDataRow for meter ${slaveId} with real data...`);
          } else {
            // มิเตอร์ที่ไม่มีข้อมูลในฐานข้อมูล - ใช้ค่า default
            console.log(`🏢 Creating ChargeDataRow for meter ${slaveId} with default values (no data in database)...`);
          }
          // เก็บค่า class ที่ผู้ใช้เลือกไว้ (ถ้ามี) หรือใช้ default
          const meterName = meter?.name || `Meter ${slaveId}`;
          const existingRow = chargeData.find(row => row.meterName === meterName);
          const selectedClass = existingRow?.class || '1.1.1'; // ใช้ class ที่เลือกไว้หรือ default
          
          // ใช้ข้อมูลจริงถ้ามี หรือค่า default ถ้าไม่มี
          const meterData = data || {
            peakDemandW: 0,
            partialDemandW: 0,
            offPeakDemandW: 0,
            maxDemandVar: 0,
            totalKWh: 0,
            peakImportKWh: 0,
            offPeakImportKWh: 0,
            records: []
          };
          
          // Debug: ตรวจสอบการเลือก class
          console.log(`🔍 Class Selection Debug for ${meterName}:`, {
            slaveId: slaveId,
            meterName: meterName,
            existingRow: existingRow,
            existingClass: existingRow?.class,
            selectedClass: selectedClass,
            chargeDataLength: chargeData.length
          });
          
          // ดึง TOU rates สำหรับ class ที่เลือก
          const touRates = getTouRates(selectedClass);
          
          // Debug: ตรวจสอบ TOU rates ที่ได้
          console.log(`🔍 Debug TOU Rates for ${selectedClass}:`, {
            selectedClass: selectedClass,
            touRates: touRates,
            onPeakRate: touRates?.onPeakRate,
            offPeakRate: touRates?.offPeakRate,
            serviceCharge: touRates?.serviceCharge
          });
          
          // คำนวณค่าไฟตาม TOU rates (จะมี rates เสมอเพราะมี fallback)
          let whCharge = 0;
          let demandCharge = 0;
          let total = 0;
          let vat = 0;
          let grandTotal = 0;
          
          // Debug: แสดงค่าที่จะใช้ในการคำนวณ
          console.log(`🧮 Calculation Input Values:`, {
            peakImportKWh: meterData.peakImportKWh,
            offPeakImportKWh: meterData.offPeakImportKWh,
            onPeakRate: touRates.onPeakRate,
            offPeakRate: touRates.offPeakRate
          });
          
          // คำนวณค่าพลังไฟฟ้า (Energy Charge)
          const onPeakCharge = meterData.peakImportKWh * touRates.onPeakRate;
          const offPeakCharge = meterData.offPeakImportKWh * touRates.offPeakRate;
          whCharge = onPeakCharge + offPeakCharge;
          
          // Debug: แสดงผลการคำนวณ
          console.log(`🧮 Calculation Results:`, {
            onPeakCharge: onPeakCharge,
            offPeakCharge: offPeakCharge,
            whCharge: whCharge
          });
          
          // ค่า Demand Charge (สำหรับ residential มักเป็น 0)
          demandCharge = meterData.peakDemandW * touRates.demandCharge; // Convert W to kW
          
          // รวมค่าบริการ
          const subtotal = whCharge + demandCharge + touRates.serviceCharge;
          
          // คำนวณ FT (Fuel Tariff) - ใช้ค่าคงที่ 0.1572
          const ftCharge = (meterData.peakImportKWh + meterData.offPeakImportKWh) * 0.1572;
          
          // รวมก่อน VAT
          total = subtotal + ftCharge;
          
          // VAT 7%
          vat = total * 0.07;
          
          // รวมทั้งหมด
          grandTotal = total + vat;
          
          // แสดง log การคำนวณแบบละเอียดและอ่านง่าย
          console.log(`\n💰 === TOU BILLING CALCULATION FOR ${meterName} ===`);
          console.log(`📋 Class: ${selectedClass} (${touRates.name})`);
          console.log(`\n📊 === ENERGY CONSUMPTION DATA ===`);
          console.log(`🔴 On Peak kWh: ${meterData.peakImportKWh.toFixed(2)} kWh`);
          console.log(`🟢 Off Peak kWh: ${meterData.offPeakImportKWh.toFixed(2)} kWh`);
          console.log(`📊 Total kWh: ${(meterData.peakImportKWh + meterData.offPeakImportKWh).toFixed(2)} kWh`);
          console.log(`⚡ Peak Demand: ${meterData.peakDemandW.toFixed(2)} W (${(meterData.peakDemandW/1000).toFixed(3)} kW)`);
          
          console.log(`\n💵 === TOU RATES ===`);
          console.log(`🔴 On Peak Rate: ${touRates.onPeakRate} บาท/kWh`);
          console.log(`🟢 Off Peak Rate: ${touRates.offPeakRate} บาท/kWh`);
          console.log(`🏢 Service Charge: ${touRates.serviceCharge} บาท/เดือน`);
          console.log(`⚡ Demand Charge Rate: ${touRates.demandCharge} บาท/kW`);
          console.log(`⛽ FT Rate: 0.1572 บาท/kWh (ค่าเชื้อเพลิง)`);
          
          console.log(`\n🧮 === STEP-BY-STEP CALCULATION ===`);
          console.log(`\n1️⃣ WH CHARGE (ค่าพลังไฟฟ้า):`);
          console.log(`   🔴 On Peak Charge = ${meterData.peakImportKWh.toFixed(2)} × ${touRates.onPeakRate} = ${onPeakCharge.toFixed(2)} บาท`);
          console.log(`   🟢 Off Peak Charge = ${meterData.offPeakImportKWh.toFixed(2)} × ${touRates.offPeakRate} = ${offPeakCharge.toFixed(2)} บาท`);
          console.log(`   📊 Total Wh Charge = ${onPeakCharge.toFixed(2)} + ${offPeakCharge.toFixed(2)} = ${whCharge.toFixed(2)} บาท`);
          
          console.log(`\n2️⃣ DEMAND CHARGE (ค่าความต้องการสูงสุด):`);
          console.log(`   🔴 On Peak Demand: ${meterData.peakDemandW.toFixed(2)} W (${(meterData.peakDemandW/1000).toFixed(3)} kW)`);
          console.log(`   🟢 Off Peak Demand: ${meterData.offPeakDemandW.toFixed(2)} W (${(meterData.offPeakDemandW/1000).toFixed(3)} kW)`);
          console.log(`   ⚡ Total Demand Charge = ${(meterData.peakDemandW/1000).toFixed(3)} kW × ${touRates.demandCharge} = ${demandCharge.toFixed(2)} บาท`);
          if (touRates.demandCharge === 0) {
            console.log(`   ℹ️  Note: Residential class ไม่มีค่า Demand Charge (ใช้เฉพาะ kWh)`);
          }
          
          console.log(`\n3️⃣ SERVICE CHARGE (ค่าบริการรายเดือน):`);
          console.log(`   🏢 Service Charge = ${touRates.serviceCharge} บาท/เดือน`);
          
          console.log(`\n4️⃣ FT CHARGE (ค่าเชื้อเพลิง):`);
          console.log(`   ⛽ FT Charge = ${(meterData.peakImportKWh + meterData.offPeakImportKWh).toFixed(2)} kWh × 0.1572 = ${ftCharge.toFixed(2)} บาท`);
          
          console.log(`\n5️⃣ SUBTOTAL (รวมก่อน VAT):`);
          console.log(`   📊 Subtotal = Wh Charge + Demand Charge + Service Charge + FT Charge`);
          console.log(`   📊 Subtotal = ${whCharge.toFixed(2)} + ${demandCharge.toFixed(2)} + ${touRates.serviceCharge} + ${ftCharge.toFixed(2)} = ${total.toFixed(2)} บาท`);
          
          console.log(`\n6️⃣ VAT (ภาษีมูลค่าเพิ่ม 7%):`);
          console.log(`   💸 VAT = ${total.toFixed(2)} × 7% = ${vat.toFixed(2)} บาท`);
          
          console.log(`\n7️⃣ GRAND TOTAL (รวมทั้งหมด):`);
          console.log(`   🎯 Grand Total = Subtotal + VAT = ${total.toFixed(2)} + ${vat.toFixed(2)} = ${grandTotal.toFixed(2)} บาท`);
          
          console.log(`\n💡 === POWER FACTOR INFO ===`);
          console.log(`   📐 Power Factor: ไม่ได้คำนวณในระบบนี้ (แสดงเป็น 0)`);
          console.log(`   ℹ️  Note: Power Factor มักใช้สำหรับ Industrial/Commercial customers`);
          
          console.log(`\n📋 === SUMMARY ===`);
          console.log(`   🏢 Meter: ${meterName}`);
          console.log(`   📋 Class: ${selectedClass}`);
          console.log(`   🔴 On Peak: ${meterData.peakImportKWh.toFixed(2)} kWh × ${touRates.onPeakRate} = ${onPeakCharge.toFixed(2)} บาท`);
          console.log(`   🟢 Off Peak: ${meterData.offPeakImportKWh.toFixed(2)} kWh × ${touRates.offPeakRate} = ${offPeakCharge.toFixed(2)} บาท`);
          console.log(`   💰 Final Bill: ${grandTotal.toFixed(2)} บาท`);
          console.log(`===============================================\n`);
          
          // สร้าง ChargeDataRow ตามประเภท
          let chargeRow: ChargeDataRow;
          
          if (selectedClass === '4.1.1') {
            // สำหรับประเภท 4.1.1 (TOD) - ใช้ข้อมูล TOD
            chargeRow = {
              meterName: meterName,
              slaveId: slaveId,
              class: selectedClass,
              // TOD Demand values
              peakDemandW: meterData.peakDemandW || 0, // Peak Demand (18:30-21:30)
              partialDemandW: meterData.partialDemandW || 0, // Partial Demand (08:00-18:30)
              // เก็บ compatibility กับ TOU fields
              onPeakDemandW: meterData.peakDemandW || 0,
              offPeakDemandW: meterData.offPeakDemandW || 0, // Off Peak Demand (21:30-08:00)
              // TOD kWh values
              totalKWh: meterData.totalKWh || 0, // ใช้ total kWh สำหรับ 4.1.1
              onPeakKWh: meterData.totalKWh || 0, // ใช้ total kWh เพื่อ compatibility
              offPeakKWh: 0, // ไม่แยกใน TOD
              onPeakImportWh: (meterData.totalKWh || 0) * 1000, // Convert to Wh
              offPeakImportWh: 0,
              importKWh: meterData.totalKWh || 0,
              demandVar: meterData.maxDemandVar || 0,
              demandVA: 0,
              powerFactorTotal: 0,
              whCharge: null, // จะคำนวณใน largeGeneralService
              onPeakWhCharge: null,
              offPeakWhCharge: null,
              demandCharge: null, // จะคำนวณใน largeGeneralService
              onPeakDemandCharge: null,
              offPeakDemandCharge: null,
              serviceCharge: null,
              ft: null,
              surcharge: null,
              total: null, // จะคำนวณใน largeGeneralService
              vat: null,
              grandTotal: null
            };
          } else {
            // สำหรับประเภทอื่นๆ (TOU) - ใช้ข้อมูล TOU
            chargeRow = {
              meterName: meterName,
              slaveId: slaveId,
              class: selectedClass,
              onPeakDemandW: meterData.peakDemandW || 0,
              offPeakDemandW: meterData.offPeakDemandW || 0,
              onPeakImportWh: (meterData.peakImportKWh || 0) * 1000,
              offPeakImportWh: (meterData.offPeakImportKWh || 0) * 1000,
              demandVar: meterData.maxDemandVar || 0,
              demandVA: 0,
              importKWh: (meterData.peakImportKWh || 0) + (meterData.offPeakImportKWh || 0),
              powerFactorTotal: 0,
              offPeakKWh: meterData.offPeakImportKWh || 0,
              onPeakKWh: meterData.peakImportKWh || 0,
              totalKWh: (meterData.peakImportKWh || 0) + (meterData.offPeakImportKWh || 0),
              whCharge: null, // จะคำนวณใน calculator functions
              onPeakWhCharge: null,
              offPeakWhCharge: null,
              demandCharge: null,
              onPeakDemandCharge: null,
              offPeakDemandCharge: null,
              serviceCharge: null,
              ft: null,
              surcharge: null,
              total: null,
              vat: null,
              grandTotal: null
            };
          }
          
        
          chargeDataRows.push(chargeRow);
        });
        
        console.log(`✅ Created charge data for ${chargeDataRows.length} meters (${meterDataMap.size} with real data, ${meterList.length - meterDataMap.size} with default values)`);
        console.log('📊 === FINAL TOU CHARGE DATA SUMMARY ===');
        chargeDataRows.forEach(row => {
          const hasRealData = meterDataMap.has(parseInt(row.slaveId?.toString() || '0'));
          const dataType = hasRealData ? '(Real Data)' : '(Default Values)';
          console.log(`🏢 ${row.meterName} ${dataType}:`);
          console.log(`   🔴 On Peak - DmW: ${row.onPeakDemandW.toFixed(2)}, kWh: ${row.onPeakKWh.toFixed(2)}, Wh: ${row.onPeakImportWh.toLocaleString()}`);
          console.log(`   🟢 Off Peak - DmW: ${row.offPeakDemandW.toFixed(2)}, kWh: ${row.offPeakKWh.toFixed(2)}, Wh: ${row.offPeakImportWh.toLocaleString()}`);
          console.log(`   📊 Total kWh: ${row.totalKWh.toFixed(2)}`);
        });
        console.log('================================');
        return chargeDataRows;
      } else {
        // console.log('❌ API response failed:', response.error);
        throw new Error(response.error || 'Failed to fetch charge data');
      }
    } catch (error) {
      // console.error('❌ Error fetching charge data from API:', error);
      throw error;
    }
  };

  // Add debounce ref to prevent multiple API calls
  const loadingRef = useRef(false);
  
  // เพิ่ม counter เพื่อติดตามจำนวนครั้งที่ถูกเรียก
  const loadCountRef = useRef(0);
  
  // เพิ่ม counter เพื่อติดตาม component re-render - แสดงเฉพาะเมื่อเกิน 10 ครั้ง
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (renderCountRef.current > 10 && renderCountRef.current % 10 === 0) {
    // console.warn(`⚠️ HIGH RENDER COUNT: ${renderCountRef.current} - Possible infinite loop!`);
    //   console.log('🔍 Current state:', {
    //   isLoading,
    //   isLoaded,
    //   chargeDataLength: chargeData.length,
    //   error: !!error,
    //   meterListLength: meterList?.length || 0
    // });
  }
  
  // ลบ loadChargeData callback ที่มี dependencies มากเกินไป
  // ใช้ manualLoadChargeData แทนเพื่อหลีกเลี่ยง dependency loop

  // ไม่ auto-load เมื่อเปลี่ยน meterList - ให้ผู้ใช้กดปุ่ม Load เอง (เหมือน TableData.tsx)
  // useEffect(() => {
  //   if (meterList && meterList.length > 0 && dateFrom && dateTo) {
  //     // ป้องกันการเรียกซ้ำถ้ากำลังโหลดอยู่
  //     if (loadingRef.current) {
  //       console.log('⚠️ Skipping auto-load - already loading');
  //       return;
  //     }
  //     
  //     // ป้องกันการเรียกซ้ำถ้าเพิ่งโหลดไปแล้ว (ภายใน 1 วินาที)
  //     const now = Date.now();
  //     const lastLoadTime = loadingRef.lastLoadTime || 0;
  //     if (now - lastLoadTime < 1000) {
  //       // console.log('⚠️ Skipping auto-load - too frequent');
  //       return;
  //     }
  //     
  //     // console.log('✅ Auto-loading charge data for meter list change:', meterList.map(m => m.name).join(', '));
  //     
  //     // บันทึกเวลาที่โหลด
  //     loadingRef.lastLoadTime = now;
  //     
  //     // เรียกใช้ manual load function
  //     manualLoadChargeData();
  //   }
  // }, [meterList]); // ไม่ต้องใส่ dateFrom, dateTo ใน dependency เพราะจะทำให้โหลดซ้ำ


  // Function to test charge data API
  const testChargeDataAPI = async () => {
    try {
      // console.log('🧪 Testing charge data API...');
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.testChargeDataApi();
      // console.log('🧪 API Test Response:', response);
      
      if (response.success) {
        // console.log('✅ API test successful!');
        // console.log('📊 Available tables:', response.data?.availableTables);
        // console.log('📊 Available meters:', response.data?.availableMeters);
        
        // แสดงผลลัพธ์ใน UI
        // alert(`API Test Successful!\n\nAvailable Tables: ${response.data?.availableTables?.map(t => t.table_name).join(', ') || 'None'}\n\nAvailable Meters: ${response.data?.availableMeters?.length || 0} meters found`);
      } else {
        // console.log('❌ API test failed:', response.error);
        setError(`API Test Failed: ${response.error}`);
      }
    } catch (error) {
      // console.error('❌ API test error:', error);
      setError(`API Test Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manual load function - เรียกเฉพาะเมื่อกดปุ่ม (เหมือน TableData.tsx)
  const manualLoadChargeData = async () => {
    // เพิ่มจำนวนครั้งที่ถูกเรียก
    loadCountRef.current += 1;
    
    // แสดง essential logs เท่านั้น
    // console.log(`🔄 Loading charge data (Count: ${loadCountRef.current}) - ${meterList?.length || 0} meters`);
    
    // แสดง detailed logs เฉพาะเมื่อมีปัญหา (load count > 5)
    if (loadCountRef.current > 5) {
      // console.warn(`⚠️ HIGH LOAD COUNT: ${loadCountRef.current} - Possible multiple calls!`);
      console.log('📅 Date:', dateFrom, 'to', dateTo);
      console.log('⏰ Time:', timeFrom, 'to', timeTo);
      console.log('📊 Meters:', meterList?.map(m => m.name).join(', '));
    }
    
    if (!dateFrom || !dateTo || !meterList || meterList.length === 0) {
      // console.log('⚠️ Cannot load charge data - missing required parameters:', {
      //   hasDateFrom: !!dateFrom,
      //   hasDateTo: !!dateTo,
      //   hasMeterList: !!meterList,
      //   meterCount: meterList?.length || 0
      // });
      setChargeData([]);
      setIsLoaded(false);
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (loadingRef.current) {
      // console.log('⚠️ Skipping API call - already loading');
      return;
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const slaveIds = meterList.map(meter => meter.slave_id).filter(id => id && !isNaN(parseInt(id)));
      
      // แสดง detailed logs เฉพาะเมื่อมีปัญหา (load count > 3)
      if (loadCountRef.current > 3) {
        // console.log(`📊 Processing ${meterList.length} meters:`);
        // meterList.forEach((meter, index) => {
        //   console.log(`  ${index + 1}. ${meter.name} (Slave ID: ${meter.slave_id})`);
        // });
        // console.log('🔢 Extracted slave IDs:', slaveIds);
      }
      
      if (slaveIds.length === 0) {
        //  console.log('❌ No valid slave IDs found in meter list');
        setError('No valid slave IDs found in meter list');
        return;
      }
      
      const startTime = Date.now();
      const fetchedData = await fetchChargeDataFromAPI(
        slaveIds, dateFrom, dateTo, timeFrom, timeTo, meterList
      );
      const endTime = Date.now();
      
      // แสดง essential results
      console.log(`✅ Loaded ${fetchedData.length} meters in ${endTime - startTime}ms`);
      
      setChargeData(fetchedData);
      setIsLoaded(true);
      
      // แสดง Peak/Off Peak analysis สำหรับช่วงวันที่ที่เลือก (แม้ไม่มีข้อมูล)
      showPeakOffPeakAnalysis(dateFrom, dateTo, holidays);
    } catch (error) {
      // console.error('❌ Error loading charge data:', error);
      // console.error('❌ Error details:', error.message);
      // console.error('❌ Error stack:', error.stack);
      setError('Error loading charge data: ' + error.message);
      
      // แสดง Peak/Off Peak analysis แม้ว่าจะเกิด error ก็ตาม
      showPeakOffPeakAnalysis(dateFrom, dateTo, holidays);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      
      // แสดง completion log เฉพาะเมื่อมีปัญหา (load count > 3)
      if (loadCountRef.current > 3) {
        // console.log(`🏁 Load completed (Count: ${loadCountRef.current})`);
      }
    }
  };

  // Alias สำหรับความสอดคล้องกับ TableData.tsx
  const loadTableData = manualLoadChargeData;
  
  // Function to load sample data (deprecated - now loads from API)
  const loadSampleData = () => {
    // console.log('⚠️ loadSampleData is deprecated - use manualLoadChargeData instead');
    manualLoadChargeData();
  };

  // ฟังก์ชันสำหรับดึงข้อมูล parameters ตาม slave_id ที่เก็บไว้
  const fetchParametersByStoredSlaveId = async () => {
    if (!selectedSlaveId) {
      // console.log('❌ No stored slave_id available');
      return;
    }
    
    // console.log('🔢 === FETCHING PARAMETERS BY STORED SLAVE ID ===');
    // console.log(`🚀 Using stored slave_id: ${selectedSlaveId}`);
    
    try {
      const parameterResponse = await apiClient.getParameterValueBySlaveId(selectedSlaveId);
      // console.log('🚀 Parameter API Response:', parameterResponse);
      
      if (parameterResponse.success && parameterResponse.data) {
        // console.log('✅ Parameter data fetched successfully:');
        // console.log(`🚀 Total parameters: ${parameterResponse.data.length}`);
        // console.log(`🚀 First parameter:`, parameterResponse.data[0]);
        // console.log(`🚀 All parameters:`, parameterResponse.data);
        
        // เก็บข้อมูล parameters ไว้ใน state (ถ้าต้องการ)
        // setParameterData(parameterResponse.data);
      } else {
        // console.log('❌ Failed to fetch parameter data:', parameterResponse.error);
      }
    } catch (parameterError) {
      // console.error('❌ Error fetching parameter data:', parameterError);
    }
    
    // console.log('================================');
  };

  // ลบฟังก์ชัน loadTableData เดิมออกแล้ว - ใช้ alias ที่บรรทัด 2310 แทน





  // กำหนดคอลัมน์ที่ต้องการแสดงสำหรับข้อมูล Charge
  const selectedColumns = [
    'On Peak DmW ',
    'On Peak Wh',
    'Off Peak DmW ',
    'Off Peak Wh',
    'Total kWh',
    'Wh Charge',
    'Service Charge',
    'Demand Charge',
    'Power Factor',
    'FT',
    'Total',
    'VAT',
    'Grand Total',
  ];


  return (
    <PageLayout>
      <div className="pt-2 pb-6 animate-fade-in ml-0 sm:ml-2 md:ml-4 lg:ml-8">
        {/* Header */}
        <div className="flex justify-center -mt-2">
          {/* Filters */}
          <Card className="bg-transparent shadow-none border-none w-full max-w-full rounded-t-xl rounded-b-none">
                      <CardContent className="p-2 bg-transparent shadow-none">
                        <div className="flex flex-wrap items-center gap-2 bg-white rounded-t-xl rounded-b-none px-2 py-1 justify-center text-xs">
                          {/* Table Orientation Toggle */}
                          <div className="flex items-center gap-0.5 mr-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={(tableOrientation === 'horizontal' ? 'bg-primary text-white ' : 'bg-secondary text-black ') + 'h-7 px-2 text-xs rounded-none'}
                              onClick={() => setTableOrientation(tableOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                              aria-label="Toggle Table Orientation"
                            >
                              {tableOrientation === 'horizontal' ? (
                                <>
                                  {language === 'TH' ? 'แนวนอน' : 'Hor'}
                                </>
                              ) : (
                                <>
                                  {language === 'TH' ? 'แนวตั้ง' : 'Ver'}
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* From - To group in one flex row */}
                          <div className="flex items-center gap-2">
                            {/* From */}
                            <span className="text-xs font-bold text-black">{language === 'TH' ? 'จาก' : 'From'}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                      "h-7 px-1 text-xs rounded bg-white border-none shadow-none ring-0 focus:ring-0 hover:bg-white hover:text-black",
                                    !dateFrom && "text-muted-foreground"
                                  )}
                                >
                                  {dateFrom ? format(dateFrom, "dd MMMM yyyy") : "--/--/----"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateFrom}
                                  onSelect={setDateFrom}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <TimeInput24
                              value={timeFrom}
                              onChange={setTimeFrom}
                              className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            {/* To */}
                            <span className="text-xs font-bold text-black ml-0">{language === 'TH' ? 'ถึง' : 'To'}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                      "h-7 px-1 text-xs rounded bg-white border-none shadow-none ring-0 focus:ring-0 hover:bg-white hover:text-black",
                                    !dateTo && "text-muted-foreground"
                                  )}
                                >
                                  {dateTo ? format(dateTo, "dd MMMM yyyy") : "--/--/----"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateTo}
                                  onSelect={setDateTo}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <TimeInput24
                              value={timeTo}
                              onChange={setTimeTo}
                              className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                          
                          {/* Load Button */}
                          <Button
                            className={
                              cn(
                                "h-7 px-2 text-xs rounded-none shadow flex items-center",
                                isLoaded
                                  ? "bg-gray-300 text-gray-400 cursor-default"
                                  : "bg-primary hover:bg-primary/90 focus:bg-primary active:bg-primary text-white"
                              )
                            }
                            disabled={isLoading || !dateFrom || !dateTo || !meterList || meterList.length === 0}
                            onClick={() => {
                              // console.log('🔄 Load button clicked!');
                              // console.log('🔄 Current state:', { isLoading, dateFrom, dateTo, meterListLength: meterList?.length });
                              loadTableData();
                            }}
                          >
                            <Search className="w-4 h-4 mr-0" />
                            {isLoading ? (language === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (language === 'TH' ? 'โหลด' : 'Load')}
                          </Button>
                          

                          
                          {/* Date Navigation */}
                          <DateNavigation
                            onNavigate={(direction) => {
                              // console.log('🔄 Navigation clicked:', direction);
                              // console.log('🔄 Current state:', { isLoading, dateFrom, dateTo, meterListLength: meterList?.length });
                              handleDateNavigation(direction);
                            }}
                            className="ml-1"
                            disabled={isLoading || !dateFrom || !dateTo || !meterList || meterList.length === 0}
                          />
                          
                          {/* Print Button - Only show for Admin users */}
                          {isAdmin && (
                            <Button
                              className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-gray-200 shadow flex items-center ml-1"
                              variant="outline"
                              onClick={() => setShowExportModal(true)}
                              disabled={!isLoaded || !filteredData || filteredData.length === 0 || isLoading}
                            >
                              <Printer className="w-4 h-4 mr-0" />
                            </Button>
                          )}

                          <Button 
                            className="h-7 px-2 text-xs rounded-none bg-secondary hover:bg-secondary/80 shadow flex items-center ml-1" 
                            variant="outline"
                            onClick={toggleViewMode}
                            disabled={!isLoaded || !filteredData || filteredData.length === 0}
                          >
                            <BarChart3 className="w-4 h-4 mr-0" />
                            {viewMode === 'table' ? (language === 'TH' ? 'แสดงกราฟ' : 'Show Graph') : (language === 'TH' ? 'แสดงตาราง' : 'Show Table')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
        </div>


        {/* Data Table - ปรับให้ชิดกับส่วน filter */}
        <Card className="shadow-card rounded-t-none rounded-b-xl -mt-2">
          <CardContent className="p-0">
            {/* Meter Information Display */}
            {selectedNodeId && selectedNodeId.startsWith('meter-') && rootNodes && Array.isArray(rootNodes) && (() => {
              const findMeterInTree = (nodes: any[]): any => {
                for (const node of nodes) {
                  if (node.id === selectedNodeId) {
                    return node;
                  }
                  if (node.children) {
                    const found = findMeterInTree(node.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              
              const selectedMeter = findMeterInTree(rootNodes);
              
              if (selectedMeter) {
                return (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-t-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-blue-800">
                            {language === 'TH' ? 'มิเตอร์ที่เลือก:' : 'Selected Meter:'} {selectedMeter.name}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                            <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                {language === 'TH' ? 'Slave ID' : 'Slave ID'}
                              </div>
                              <div className="text-sm font-semibold text-blue-900 mt-1">
                                {selectedMeter.slave_id || 'N/A'}
                              </div>
                            </div>
                            
                            <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                {language === 'TH' ? 'ประเภท' : 'Class'}
                              </div>
                              <div className="text-sm font-semibold text-blue-900 mt-1">
                                {selectedMeter.meter_class || 'N/A'}
                              </div>
                            </div>
                            
                            <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                {language === 'TH' ? 'ชนิด' : 'Type'}
                              </div>
                              <div className="text-sm font-semibold text-blue-900 mt-1">
                                {selectedMeter.type || 'N/A'}
                              </div>
                            </div>
                            
                            <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                {language === 'TH' ? 'ตำแหน่ง' : 'Location'}
                              </div>
                              <div className="text-sm font-semibold text-blue-900 mt-1">
                                {selectedMeter.location || 'N/A'}
                              </div>
                            </div>
                            
                            <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                {language === 'TH' ? 'ค่า FT' : 'FT Value'}
                              </div>
                              <div className="text-sm font-semibold text-blue-900 mt-1">
                                {activeFTValue ? `${activeFTValue.toFixed(2)} ฿/kWh` : 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          {(selectedMeter.building || selectedMeter.floor) && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              {selectedMeter.building && (
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'อาคาร' : 'Building'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.building}
                                  </div>
                                </div>
                              )}
                              
                              {selectedMeter.floor && (
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'ชั้น' : 'Floor'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.floor}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* แสดงข้อมูล slave_id ที่เก็บไว้ใน state */}
                        {selectedSlaveId && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  {language === 'TH' ? 'Slave ID ที่เก็บไว้:' : 'Stored Slave ID:'} {selectedSlaveId}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  {language === 'TH' ? 'พร้อมใช้งานสำหรับดึงข้อมูล parameters' : 'Ready to fetch parameter data'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-100"
                                onClick={fetchParametersByStoredSlaveId}
                              >
                                {language === 'TH' ? 'ดึงข้อมูล Parameters' : 'Fetch Parameters'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* แสดงข้อมูลจำลองและระบบเลือกประเภทการคำนวณ */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 className="text-lg font-semibold text-blue-800 mb-3">
                            {language === 'TH' ? 'ข้อมูลจำลองและประเภทการคำนวณ' : 'Sample Data and Calculation Types'}
                          </h3>
                          
                          {/* แสดงข้อมูลจำลอง */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">
                              {language === 'TH' ? 'ข้อมูล Demand W จาก API' : 'Demand W Data from API'}
                            </h4>
                            <div className="text-sm text-gray-600 mb-3">
                              {language === 'TH' 
                                ? 'ดึงค่า Demand W สูงสุดจากแต่ละมิเตอร์ตามช่วงเวลาที่เลือก'
                                : 'Fetches maximum Demand W from each meter in selected time range'
                              }
                            </div>
                            
                            {/* แสดงช่วงเวลาที่เลือก */}
                            {dateFrom && dateTo && (
                              <div className="bg-gray-50 p-3 rounded-lg border">
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  {language === 'TH' ? 'ช่วงเวลาที่เลือก:' : 'Selected Time Range:'}
                                </div>
                                <div className="text-sm text-blue-600 font-mono">
                                  {dateFrom.toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })} {timeFrom} - {dateTo.toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })} {timeTo}
                                </div>
                                {meterList && meterList.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-700 mb-1">
                                      {language === 'TH' ? 'มิเตอร์ที่เลือก:' : 'Selected Meters:'}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {meterList.map(meter => meter.name).join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* แสดงประเภทการคำนวณ */}
                          <div>
                            <h4 className="text-md font-medium text-blue-700 mb-2">
                              {language === 'TH' ? 'ประเภทการคำนวณและไฟล์ Calculator:' : 'Calculation Types and Calculator Files:'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {classOptions.map((option) => (
                                <div key={option.value} className="bg-white p-2 rounded border border-blue-100">
                                  <div className="font-medium text-blue-900">{option.value}</div>
                                  <div className="text-xs text-blue-600">
                                    {language === 'TH' ? option.labelTH : option.labelEN}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    {language === 'TH' ? 'ไฟล์:' : 'File:'} {option.calculator}.js
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 bg-white/70 px-3 py-2 rounded-lg border border-blue-100">
                        <div className="text-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1 animate-pulse"></div>
                          {language === 'TH' ? 'ข้อมูล Slave ID จะแสดงใน Terminal' : 'Slave ID data shown in Terminal'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-t-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="w-full overflow-x-auto">
              {tableOrientation === 'horizontal' ? (
                <div className="max-h-[84vh]">
                  <table className="w-full min-w-[600px] text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-primary text-primary-foreground text-xs">
                      <tr className="border-b border-primary-foreground/20">
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" rowSpan={2}>Meter Name</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" rowSpan={2}>Category</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" colSpan={2}>On Peak</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" colSpan={2}>Off Peak</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" rowSpan={2}>Total kWh</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" colSpan={2}>Wh Charge (฿)</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" colSpan={2}>Demand Charge (฿)</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20 w-16" rowSpan={2}>PF (฿)</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20 w-16" rowSpan={2}>FT</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" rowSpan={2}>Total (฿)</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20" rowSpan={2}>VAT (7%)</th>
                        <th className="text-center align-middle p-2 font-semibold" rowSpan={2}>Grand Total (฿)</th>
                      </tr>
                      <tr className="border-b border-primary-foreground/20">
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">DmW </th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">Wh</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">DmW </th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">Wh</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">On Peak</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">Off Peak</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">On Peak</th>
                        <th className="text-center align-middle p-2 font-semibold border-r border-primary-foreground/20">Off Peak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={16} className="text-center py-8 text-gray-500">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-lg font-medium">
                                {language === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading data...'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : !filteredData || filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={16} className="text-center py-8 text-gray-500">
                            <div className="text-center">
                              <p className="text-lg font-medium">
                                {language === 'TH' ? 'ไม่พบข้อมูล' : 'No data found'}
                              </p>
                              <p className="text-sm mt-2">
                                {language === 'TH' ? 'กรุณาโหลดข้อมูลหรือเลือกช่วงวันที่อื่น' : 'Please load data or select a different date range'}
                              </p>
                              <div className="mt-4 space-x-2">
                                <Button 
                                  size="sm" 
                                  onClick={testChargeDataAPI}
                                  className="bg-green-500 hover:bg-green-600"
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      <span>{language === 'TH' ? 'กำลังทดสอบ...' : 'Testing...'}</span>
                                    </div>
                                  ) : (
                                    language === 'TH' ? 'ทดสอบ API' : 'Test API'
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    // console.log('🖱️ === MANUAL BUTTON CLICKED ===');
                                    // console.log('🕐 Button clicked at:', new Date().toISOString());
                                    manualLoadChargeData();
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600"
                                  disabled={!dateFrom || !dateTo || !meterList || meterList.length === 0 || isLoading}
                                >
                                  {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      <span>{language === 'TH' ? 'กำลังโหลด...' : 'Loading...'}</span>
                                    </div>
                                  ) : (
                                    language === 'TH' ? 'โหลดข้อมูล' : 'Load Data'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {filteredData && filteredData.map((row, index) => (
                            <tr 
                              key={index} 
                              className={`border-t border-gray-200 hover:bg-sky-100/80 transition-colors ${
                                index % 2 === 0 ? 'bg-sky-50' : 'bg-white'
                              }`}
                            >
                              <td 
                                className="text-right align-middle p-1 text-foreground font-medium border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => {
                                  handleMeterClick(row);
                                }}
                                title="คลิกเพื่อดูรายละเอียดการคำนวณ"
                              >
                                {row.meterName}
                              </td>
                              {/* Category Selection Column */}
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex items-center justify-center gap-1 w-full hover:bg-sky-100/80 rounded-none px-1 py-0.5 transition-colors">
                                      <span>{getShortClassDisplay(row.class)}</span>
                                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="rounded-none border border-gray-200 shadow-lg bg-white max-h-60 overflow-y-auto">
                                    {classOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => updateMeterClass(row.meterName, option.value)}
                                        className="rounded-none hover:bg-sky-50 hover:text-sky-700 focus:bg-sky-50 focus:text-sky-700 cursor-pointer px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                                      >
                                        {language === 'TH' ? option.labelTH : option.labelEN}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>

                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* On Peak DmW - แสดงค่า onPeakDemandW */}
                                {row.onPeakDemandW.toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* On Peak Wh - แสดงค่า onPeakImportWh */}
                                {typeof row.onPeakImportWh === 'number' && !isNaN(row.onPeakImportWh) 
                                  ? (row.onPeakImportWh / 1000).toLocaleString() 
                                  : '0'}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Off Peak DmW - แสดงค่า offPeakDemandW */}
                                {row.offPeakDemandW.toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Off Peak Wh - แสดงค่า offPeakImportWh */}
                                {typeof row.offPeakImportWh === 'number' && !isNaN(row.offPeakImportWh) 
                                  ? (row.offPeakImportWh / 1000).toLocaleString() 
                                  : '0'}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total kWh = (onPeak + offPeak) */}
                                {(() => {
                                  const onPeakTotal = (row.onPeakImportWh || 0) / 1000;
                                  const offPeakTotal = (row.offPeakImportWh || 0) / 1000;
                                  const totalKWh = onPeakTotal + offPeakTotal;
                                  return totalKWh.toLocaleString();
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {(() => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน smallGeneralService
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน smallGeneralService
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.2.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    const value = result.whCharge ? result.whCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    const value = result.whCharge ? result.whCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    const value = result.whCharge ? result.whCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '8') {
                                
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    const value = result.onPeakWhCharge ? result.onPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } 
                              

                                  return '0.00';
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Off Peak Wh Charge - แสดงค่าที่คำนวณได้จริง */}
                                {(() => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน smallGeneralService
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน smallGeneralService
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '2.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน smallGeneralService
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    const value = result.offPeakWhCharge ? result.offPeakWhCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } 
                                  return '0.00';
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* On Peak Demand Charge - แสดงค่าที่คำนวณได้จริง */}
                                {(() => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  }  else if (row.class === '3.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    const value = result.peakDemandCharge ? result.peakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    const value = result.peakDemandCharge ? result.peakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    const value = result.peakDemandCharge ? result.peakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    const value = result.onPeakDemandCharge ? result.onPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } 
                                  return '0.00';
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Off Peak Demand Charge - แสดงค่าที่คำนวณได้จริง */}
                                {(() => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    const value = result. offPeakDemandCharge ? result. offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    const value = result.offPeakDemandCharge ? result.offPeakDemandCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } 
                                  return '0.00';
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200 w-16">
                                {/* PF - แสดงค่า Power Factor Charge ที่คำนวณได้จริง */}
                                {(() => {
                                  if (row.class === '3.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  }  else if (row.class === '3.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '3.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน mediumGeneralService
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '4.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '5.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.1.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '6.2.3') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.1') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '7.2.2') {
                                    // ใช้ค่าที่คำนวณแล้วจากฟังก์ชัน largeGeneralService
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    const value = result.powerFactorCharge ? result.powerFactorCharge : 0;
                                    return parseFloat(value.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  } 
                                  else {
                                    const powerFactorCharge = calculatePowerFactorCharge(row);
                                    return parseFloat(powerFactorCharge.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  }
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200 w-16">
                                {/* FT - ใช้ columnDataMap */}
                                {columnDataMap['FT'](row)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total (฿) - ใช้ columnDataMap */}
                                {columnDataMap['Total'](row)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* VAT = 7% * Total (฿) */}
                                {columnDataMap['VAT'](row)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground">
                                {/* Grand Total = Total (฿) + VAT */}
                                {columnDataMap['Grand Total'](row)}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Total Row - Only show when there's data */}
                          {filteredData && filteredData.length > 0 && (
                            <tr className="border-t-2 border-gray-400 bg-gray-100 font-bold">
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200 colspan=2">
                                TOTAL
                              </td>
                              
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                -
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total On Peak DmW */}
                                {filteredData.reduce((sum, row) => sum + row.onPeakDemandW, 0).toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total On Peak Wh */}
                                {filteredData.reduce((sum, row) => sum + ((row.onPeakImportWh || 0) / 1000), 0).toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total Off Peak DmW */}
                                {filteredData.reduce((sum, row) => sum + row.offPeakDemandW, 0).toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total Off Peak Wh */}
                                {filteredData.reduce((sum, row) => sum + ((row.offPeakImportWh || 0) / 1000), 0).toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total kWh */}
                                {filteredData.reduce((sum, row) => {
                                  const onPeakTotal = (row.onPeakImportWh || 0) / 1000;
                                  const offPeakTotal = (row.offPeakImportWh || 0) / 1000;
                                  return sum + onPeakTotal + offPeakTotal;
                                }, 0).toLocaleString()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total On Peak Wh Charge */}
                                {filteredData.reduce((sum, row) => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '2.1.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '2.2.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '2.2.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.1.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.1.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.1.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.2.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.2.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '3.2.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.1.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.1.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.1.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.2.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.2.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '4.2.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.1.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.1.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.1.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.2.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.2.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '5.2.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '6.1.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '6.1.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '6.1.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '6.2.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    return sum + (result.onPeakWhCharge || 0); 
                                  } else if (row.class === '6.2.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '6.2.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '7.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '7.2.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '7.2.2') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    return sum + (result.onPeakWhCharge || 0);
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    return sum + (result.onPeakWhCharge || 0);
                                  }
                                  return sum;
                                }, 0).toFixed(2)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total Off Peak Wh Charge */}
                                {filteredData.reduce((sum, row) => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '2.1.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '2.2.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '2.2.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.1.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.1.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.1.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.2.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.2.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '3.2.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.1.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.1.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.1.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.2.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.2.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '4.2.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.1.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.1.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.1.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.2.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.2.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '5.2.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '6.1.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '6.1.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '6.1.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '6.2.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    return sum + (result.offPeakWhCharge || 0); 
                                  } else if (row.class === '6.2.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '6.2.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '7.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '7.2.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '7.2.2') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    return sum + (result.offPeakWhCharge || 0);
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    return sum + (result.offPeakWhCharge || 0);
                                  }
                                  return sum;
                                }, 0).toFixed(2)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total On Peak Demand Charge */}
                                {filteredData.reduce((sum, row) => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '2.1.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '2.2.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '2.2.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '6.2.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    return sum + (result.onPeakDemandCharge || 0); 
                                  } else if (row.class === '6.2.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '6.2.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '7.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '7.2.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '7.2.2') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    return sum + (result.onPeakDemandCharge || 0);
                                  }
                                  return sum;
                                }, 0).toFixed(2)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total Off Peak Demand Charge */}
                                {filteredData.reduce((sum, row) => {
                                  if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                    const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '2.1.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '2.1.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '2.2.1') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '2.2.2') {
                                    const result = useCalculatorFile.smallGeneralService(row, row.class as '2.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.1.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.1') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.2') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '3.2.3') {
                                    const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.2.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.1.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.1') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.2') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '4.2.3') {
                                    const result = useCalculatorFile.largeGeneralService(row, row.class as '4.2.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.1.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.1') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.2') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '5.2.3') {
                                    const result = useCalculatorFile.specificBusinessService(row, row.class as '5.2.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '6.1.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '6.2.1') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.1');
                                    return sum + (result.offPeakDemandCharge || 0); 
                                  } else if (row.class === '6.2.2') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '6.2.3') {
                                    const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.2.3');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '7.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '7.2.1') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.1');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '7.2.2') {
                                    const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.2.2');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  } else if (row.class === '8') {
                                    const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                    return sum + (result.offPeakDemandCharge || 0);
                                  }
                                  return sum;
                                }, 0).toFixed(2)}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total PF - รวมค่า Power Factor Charge ที่คำนวณได้จริง */}
                                {(() => {
                                  const totalPF = filteredData.reduce((sum, row) => {
                                    const powerFactorCharge = calculatePowerFactorCharge(row);
                                    return sum + powerFactorCharge;
                                  }, 0);
                                  return totalPF.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total FT - คำนวณจริงจากการเรียกฟังก์ชัน calculateFTValue */}
                                {(() => {
                                  const totalFT = filteredData.reduce((sum, row) => {
                                    const ft = calculateFTValue(row);
                                    return sum + ft;
                                  }, 0);
                                  return totalFT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total (฿) - คำนวณจริงจากการเรียกฟังก์ชันคำนวณแต่ละประเภท */}
                                {(() => {
                                  const total = filteredData.reduce((sum, row) => {
                                    // คำนวณค่าไฟรวมสำหรับแต่ละ row โดยใช้ฟังก์ชันที่เหมาะสม
                                    let whCharge = 0;
                                    let serviceCharge = 0;
                                    let demandCharge = 0;
                                    let powerFactorCharge = 0;
                                    
                                    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
                                      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
                                      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
                                      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
                                      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
                                      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
                                      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '8') {
                                      const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    }
                                    
                                    const ft = calculateFTValue(row);
                                    const rowTotal = whCharge + serviceCharge + demandCharge + powerFactorCharge + ft;
                                    return sum + rowTotal;
                                  }, 0);
                                  return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground border-r border-gray-200">
                                {/* Total VAT - คำนวณ 7% ของ Total */}
                                {(() => {
                                  const totalVAT = filteredData.reduce((sum, row) => {
                                    // คำนวณค่าไฟรวมสำหรับแต่ละ row เหมือนด้านบน
                                    let whCharge = 0;
                                    let serviceCharge = 0;
                                    let demandCharge = 0;
                                    let powerFactorCharge = 0;
                                    
                                    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
                                      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
                                      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
                                      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
                                      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
                                      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
                                      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '8') {
                                      const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    }
                                    
                                    const ft = calculateFTValue(row);
                                    const rowTotal = whCharge + serviceCharge + demandCharge + powerFactorCharge + ft;
                                    const vat = rowTotal * 0.07; // 7% VAT
                                    return sum + vat;
                                  }, 0);
                                  return totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="text-center align-middle p-1 text-foreground">
                                {/* Total Grand Total - Total + VAT */}
                                {(() => {
                                  const totalGrandTotal = filteredData.reduce((sum, row) => {
                                    // คำนวณค่าไฟรวมสำหรับแต่ละ row เหมือนด้านบน
                                    let whCharge = 0;
                                    let serviceCharge = 0;
                                    let demandCharge = 0;
                                    let powerFactorCharge = 0;
                                    
                                    if (row.class === '1.1.1' || row.class === '1.1.2' || row.class === '1.1.3.1' || row.class === '1.1.3.2') {
                                      const result = useCalculatorFile.residentialService(row, row.class as '1.1.1' | '1.1.2' | '1.1.3.1' | '1.1.3.2', {});
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '2.1.1' || row.class === '2.1.2' || row.class === '2.2.1' || row.class === '2.2.2') {
                                      const result = useCalculatorFile.smallGeneralService(row, row.class as '2.1.1' | '2.1.2' | '2.2.1' | '2.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '3.1.1' || row.class === '3.1.2' || row.class === '3.1.3' || row.class === '3.2.1' || row.class === '3.2.2' || row.class === '3.2.3') {
                                      const result = useCalculatorFile.mediumGeneralService(row, row.class as '3.1.1' | '3.1.2' | '3.1.3' | '3.2.1' | '3.2.2' | '3.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '4.1.1' || row.class === '4.1.2' || row.class === '4.1.3' || row.class === '4.2.1' || row.class === '4.2.2' || row.class === '4.2.3') {
                                      const result = useCalculatorFile.largeGeneralService(row, row.class as '4.1.1' | '4.1.2' | '4.1.3' | '4.2.1' | '4.2.2' | '4.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '5.1.1' || row.class === '5.1.2' || row.class === '5.1.3' || row.class === '5.2.1' || row.class === '5.2.2' || row.class === '5.2.3') {
                                      const result = useCalculatorFile.specificBusinessService(row, row.class as '5.1.1' | '5.1.2' | '5.1.3' | '5.2.1' | '5.2.2' | '5.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '6.1.1' || row.class === '6.1.2' || row.class === '6.1.3' || row.class === '6.2.1' || row.class === '6.2.2' || row.class === '6.2.3') {
                                      const result = useCalculatorFile.govNonprofitOrg(row, row.class as '6.1.1' | '6.1.2' | '6.1.3' | '6.2.1' | '6.2.2' | '6.2.3');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '7.1' || row.class === '7.2.1' || row.class === '7.2.2') {
                                      const result = useCalculatorFile.waterPumpingAgricultural(row, row.class as '7.1' | '7.2.1' | '7.2.2');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    } else if (row.class === '8') {
                                      const result = useCalculatorFile.temporaryTariff(row, row.class as '8');
                                      whCharge = result.whCharge || 0;
                                      serviceCharge = result.serviceCharge || 0;
                                      demandCharge = result.demandCharge || 0;
                                      powerFactorCharge = result.powerFactorCharge || 0;
                                    }
                                    
                                    const ft = calculateFTValue(row);
                                    const rowTotal = whCharge + serviceCharge + demandCharge + powerFactorCharge + ft;
                                    const vat = rowTotal * 0.07; // 7% VAT
                                    const grandTotal = rowTotal + vat;
                                    return sum + grandTotal;
                                  }, 0);
                                  return totalGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>


              ) : (
                <div className="max-h-[80vh] overflow-y-auto">
                  <table className="min-w-max w-fit text-xs">
                    <thead className="sticky top-0 z-10 bg-gradient-primary text-primary-foreground text-xs">
                      <tr>
                        <th className="text-left p-2 font-semibold">Field</th>
                        {filteredData && filteredData.length > 0 ? (
                          filteredData.map((_, index) => (
                            <th key={index} className="text-center p-2 font-semibold">{index + 1}</th>
                          ))
                        ) : (
                          <th className="text-center p-2 font-semibold">-</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-gray-500">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-lg font-medium">
                                {language === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading data...'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : !filteredData || filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-gray-500">
                            <div className="text-center">
                              <p className="text-lg font-medium">
                                {language === 'TH' ? 'ไม่พบข้อมูล' : 'No data found'}
                              </p>
                              <p className="text-sm mt-2">
                                {language === 'TH' ? 'กรุณาโหลดข้อมูลหรือเลือกช่วงวันที่อื่น' : 'Please load data or select a different date range'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* Meter Name row always on top */}
                          <tr className="border-t hover:bg-sky-100/80 transition-colors bg-sky-50">
                            <td className="p-1 text-foreground font-medium">Meter Name</td>
                            <td className="p-1 text-foreground font-medium">Voltage</td>
                            {filteredData && filteredData.map((row, index) => (
                              <td 
                                key={index} 
                                className="text-center p-1 text-foreground cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => {
                                  handleMeterClick(row);
                                }}
                                title="คลิกเพื่อดูรายละเอียดการคำนวณ"
                              >
                                {row.meterName}
                              </td>
                            ))}
                          </tr>
                      {/* Category row */}
                      <tr className="border-t hover:bg-sky-100/80 transition-colors bg-white">
                        <td className="p-1 text-foreground font-medium">Category</td>
                        {filteredData && filteredData.map((row, index) => (
                          <td key={index} className="text-center p-1 text-foreground cursor-pointer hover:bg-sky-100/80">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center justify-center gap-1 w-full hover:bg-sky-100/80 rounded px-1 py-0.5 transition-colors">
                                  <span>{getShortClassDisplay(row.class)}</span>
                                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="rounded-none border border-gray-200 shadow-lg bg-white max-h-60 overflow-y-auto">
                                {classOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => updateMeterClass(row.meterName, option.value)}
                                    className="rounded-none hover:bg-sky-50 hover:text-sky-700 focus:bg-sky-50 focus:text-sky-700 cursor-pointer px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                                  >
                                    {language === 'TH' ? option.labelTH : option.labelEN}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        ))}
                      </tr>
                      {/* Render only selected columns as rows */}
                      {selectedColumns.map((col, idx) => {
                        // Map column name to data
                        let label = col;
                        let getValue = columnDataMap[col] || (() => '-');
                        
                        // Debug logging for FT column
                        if (col === 'FT') {
                          // console.log('🔍 Rendering FT column');
                          // console.log('📊 columnDataMap[FT]:', columnDataMap[col]);
                          // console.log('📊 filteredData:', filteredData);
                        }
                        
                        return (
                          <tr key={col} className={`border-t hover:bg-sky-100/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50'}`}> 
                            <td className="p-1 text-foreground font-medium">{label}</td>
                        {filteredData && filteredData.map((row, index) => {
                          const value = getValue(row);
                          if (col === 'FT') {
                            // console.log(`💰 FT value for row ${index}:`, value);
                          }
                          return (
                            <td key={index} className="text-center p-1 text-foreground">{value}</td>
                          );
                        })}
                      </tr>
                        );
                      })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>




      {/* Calculation Modal */}
      {showCalculation && selectedRow && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto border border-gray-300">
            <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Calculation for {selectedRow.meterName}
              </h2>
              <button
                onClick={() => setShowCalculation(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const calc = calculateValues(selectedRow);
              return (
                <div className="grid grid-cols-2 gap-6">
                                     {/* Left Section - Detailed Calculation */}
                   <div className="space-y-4">
                     <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-blue-800">TOU</h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-3 gap-2">
                           <div className="font-semibold">Units (kWh)</div>
                           <div className="font-semibold">Rate (Baht/kWh)</div>
                           <div className="font-semibold">Cost (Baht)</div>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                           <div>On Peak: {calc.onPeakWh.toLocaleString()}</div>
                           <div>4.1839</div>
                           <div>{calc.onPeakTotal.toFixed(2)}</div>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                           <div>Off Peak: {calc.offPeakWh.toLocaleString()}</div>
                           <div>2.6037</div>
                           <div>{calc.offPeakTotal.toFixed(2)}</div>
                         </div>
                         <div className="border-t border-gray-300 pt-2 font-bold">
                           Total: {calc.totalKWh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                         </div>
                       </div>
                     </div>

                                         <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-green-800">FT Charge </h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <div>FT (Baht/kWh):</div>
                           <div>0.1572</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Units (kWh):</div>
                           <div>{selectedRow.totalKWh.toLocaleString()}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Total (฿):</div>
                           <div>{calc.ft.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                         </div>
                       </div>
                     </div>

                                         <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-purple-800">Demand Charge</h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <div>On Peak Demand (kW):</div>
                           <div>{selectedRow.onPeakDemandW}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Off Peak Demand (kW):</div>
                           <div>{selectedRow.offPeakDemandW}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Demand Rate (Baht/kW):</div>
                           <div>132.93</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Total (฿):</div>
                           <div>{calc.demandCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                         </div>
                       </div>
                     </div>

                                         <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-yellow-800">Power Factor</h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <div>Power Factor:</div>
                           <div>{(() => {
                             const demandVar = 0; // ไม่มี demandVar ใน calc object
                             const maxDemandW = Math.max(calc.onPeakDmW || 0, calc.offPeakDmW || 0);
                             const allowedReactive = maxDemandW * 0.6197;
                             const excessReactive = demandVar - allowedReactive;
                             let kilovar = 0;
                             if (excessReactive > 0) {
                               if (excessReactive >= 0.5) {
                                 kilovar = Math.ceil(excessReactive);
                               } else {
                                 kilovar = 0;
                               }
                             }
                             return kilovar;
                           })()}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Power Factor Rate (Baht/KVAR):</div>
                           <div>56.07</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Total (฿):</div>
                           <div>{calc.powerFactorCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                         </div>
                       </div>
                     </div>

                                         <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-orange-800">Total  (kWh+Peak+PF+Ft)</h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <div>TOU Cost:</div>
                           <div>{calc.totalKWh.toFixed(2)}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Demand Charge (Baht):</div>
                           <div>{calc.demandCharge.toFixed(2)}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>Power Factor (Baht):</div>
                           <div>{calc.powerFactorCharge.toFixed(2)}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>FT (Baht):</div>
                           <div>{calc.ft.toFixed(2)}</div>
                         </div>
                         <div className="border-t border-gray-300 pt-2 font-bold">
                           Total: {calc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                         </div>
                       </div>
                     </div>

                                         <div className="border border-gray-300 p-4">
                       <h3 className="font-bold text-lg mb-3 text-red-800">VAT</h3>
                       <div className="space-y-2 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <div>Total :</div>
                           <div>{calc.total.toFixed(2)}</div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>VAT 7% :</div>
                           <div>{calc.vat.toFixed(2)}</div>
                         </div>
                         <div className="border-t border-gray-300 pt-2 font-bold">
                           Grand Total: {calc.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                         </div>
                       </div>
                     </div>
                   </div>

                                     {/* Right Section - Bill Summary */}
                   <div className="border border-gray-300 p-4">
                     <h3 className="font-bold text-xl mb-4 text-center">Summary</h3>
                     <div className="space-y-3 text-sm">
                       <div className="grid grid-cols-2 gap-2">
                         <div className="font-semibold">Device Name:</div>
                         <div>{selectedRow.meterName}</div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <div className="font-semibold">Total kWh:</div>
                         <div>{selectedRow.totalKWh.toLocaleString()}</div>
                       </div>
                       <div className="border-t border-gray-300 pt-3 mt-4">
                         <h4 className="font-bold mb-2">Details</h4>
                         <div className="space-y-2">
                           <div className="grid grid-cols-2 gap-2">
                             <div>TOU Cost:</div>
                             <div>{calc.totalKWh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <div>Demand Charge:</div>
                             <div>{calc.demandCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <div>Power Factor :</div>
                             <div>{calc.powerFactorCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <div>FT :</div>
                             <div>{calc.ft.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                           </div>
                           <div className="border-t border-gray-300 pt-2 font-bold">
                             <div className="grid grid-cols-2 gap-2">
                               <div>Total Exclude VAT :</div>
                               <div>{calc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                             </div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <div>VAT 7% :</div>
                             <div>{calc.vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                           </div>
                           <div className="border-t border-gray-300 pt-2 font-bold">
                             <div className="grid grid-cols-2 gap-2">
                               <div>Grand Total:</div>
                               <div>{calc.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      

      
      {/* Calculation Detail Modal */}
      <CalculationModal
        isOpen={showCalculationModal}
        onClose={() => setShowCalculationModal(false)}
        selectedMeter={selectedMeterForCalculation}
        dateFrom={dateFrom}
        dateTo={dateTo}
        timeFrom={timeFrom}
        timeTo={timeTo}
      />
      
      {/* Print Modal */}
      <PrintModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        onSendReport={handleSendReport}
        isLoaded={isLoaded}
        hasData={filteredData ? filteredData.length > 0 : false}
        isLoading={isLoading}
        isSending={isSending}
        emailGroups={emailGroups}
        lineGroups={lineGroups}
        emailList={emailList}
        lineList={lineList}
      />
    </PageLayout>
  );
}
