import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, X, Globe, Phone, Mail, Printer } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useEmailData } from '../../context/EmailDataContext';
import { handleSendReport as utilHandleSendReport, type SendReportPayload, type ReportData } from '../../utils/reportUtils';
import { useToast } from '@/hooks/use-toast';
import useCustomSwal from '@/utils/swal';
import { PrintModal } from './print-modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

interface ChargeDataRow {
  meterName: string;
  slaveId?: number | string;
  class: string;
  onPeakDemandW: number;
  offPeakDemandW: number;
  onPeakImportWh: number;
  offPeakImportWh: number;
  onPeakWhCharge: number;
  offPeakWhCharge: number;
  demandVar: number;
  demandVA: number;
  importKWh: number;
  powerFactorTotal: number;
  offPeakKWh: number;
  onPeakKWh: number;
  totalKWh: number;
  whCharge: number | null;
  demandCharge: number | null;
  onPeakDemandCharge: number | null;
  offPeakDemandCharge: number | null;
  serviceCharge: number | null;
  ft: number | null;
  total: number | null;
  totalwhcharge: number | null;
  totaldemandcharge: number | null;
  totalcharge: number | null;
  vat: number | null;
  grandTotal: number | null;
}

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMeter: ChargeDataRow | null;
  dateFrom?: Date;
  dateTo?: Date;
  timeFrom?: string;
  timeTo?: string;
}

export const CalculationModal: React.FC<CalculationModalProps> = ({
  isOpen,
  onClose,
  selectedMeter,
  dateFrom,
  dateTo,
  timeFrom,
  timeTo
}) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { showSuccessToast, showErrorToast } = useCustomSwal();
  
  // Debug: ตรวจสอบค่า language
  console.log('Current language in CalculationModal:', language);
  
  // ข้อความในสองภาษา
  const texts = {
    TH: {
      disclaimer: {
        line1: "* การคำนวณที่ได้เป็นเพียงการประมาณการค่าไฟฟ้าเบื้องต้นเท่านั้น",
        line2: "** สูตรการคำนวณดังกล่าวมีผลตั้งแต่ค่าไฟฟ้าประจำเดือน พฤศจิกายน 2561 จนถึงปัจจุบัน",
        line3: "หรือจนกว่าจะมีประกาศเปลี่ยนแปลงโครงสร้างอัตราค่าไฟฟ้าจากคณะกรรมการกำกับกิจการพลังงาน"
      },
      touTitle: "ข้อกำหนดช่วงเวลาอัตรา TOU",
      meterType: "ประเภท",
      peak: {
        title: "Peak :",
        time: "เวลา 09.00 น. - 22.00 น.",
        days1: "วันจันทร์ – ศุกร์",
        days2: "และวันพืชมงคล"
      },
      offPeak: {
        title: "Off Peak :",
        time1: "เวลา 22.00 น.- 09.00 น.",
        days1: "วันจันทร์ – ศุกร์ และวันพืชมงคล",
        time2: "เวลา 00.00 น.- 24.00 น.",
        days2: "วันเสาร์ - อาทิตย์, วันแรงงานแห่งชาติ,",
        days3: "วันพืชมงคลที่ตรงกับวันเสาร์ – อาทิตย์",
        days4: "และ วันหยุดราชการตามปกติ",
        days5: "(ไม่รวมวันหยุดชดเชย)"
      }
    },
    EN: {
      disclaimer: {
        line1: "* This calculation is only a preliminary electricity bill estimation",
        line2: "** This calculation formula has been effective since November 2018 electricity bill to present",
        line3: "or until there is an announcement of changes to the electricity tariff structure from the Energy Regulatory Commission"
      },
      touTitle: "TOU Rate Time Period Requirements",
      meterType: "Category",
      peak: {
        title: "Peak :",
        time: "Time 09:00 AM - 10:00 PM",
        days1: "Monday – Friday",
        days2: "and Royal Ploughing Ceremony Day"
      },
      offPeak: {
        title: "Off Peak :",
        time1: "Time 10:00 PM - 09:00 AM",
        time2: "Time 00:00 AM - 12:00 PM",
        days2: "Saturday - Sunday, National Labour Day,",
        days3: "Royal Ploughing Ceremony Day that falls on Saturday – Sunday",
        days4: "and regular government holidays",
        days5: "(excluding substitute holidays)"
      }
    }
  };

  const currentTexts = texts[language as keyof typeof texts] || texts.TH;
  
  // ใช้ EmailDataContext สำหรับข้อมูล email และ line
  const emailDataCtx = (() => {
    try { return useEmailData(); } catch { return null as any; }
  })();
  
  // State สำหรับ Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // State สำหรับ QR Code PDF URL
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // State สำหรับข้อมูลกราฟ
  const [chartData, setChartData] = useState<{
    current: number;
    previous: number;
    currentLabel: string;
    previousLabel: string;
  } | null>(null);
  
  // ฟังก์ชันจัดรูปแบบตัวเลขให้มีเครื่องหมายจุลภาค
  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };
  
  // ฟังก์ชันสำหรับจัดการ Print Modal
  const handlePrintClick = () => {
    setIsPrintModalOpen(true);
  };
  
  const handlePrintModalClose = () => {
    setIsPrintModalOpen(false);
  };
  
  // ฟังก์ชันสร้าง QR Code ที่ลิงก์ไปยังรูปภาพ
  const generatePDFAndQRCode = async () => {
    if (!selectedMeter) return;
    
    try {
      // สร้างรูปภาพจาก modal ก่อน
      await generateImageForQR();
      
    } catch (error) {
      console.error('Error generating QR Code:', error);
      // Fallback QR Code
      const fallbackData = `${selectedMeter.meterName} Total Paid ${formatNumber(selectedMeter.grandTotal ?? 0)}`;
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(fallbackData)}`;
      setQrCodeUrl(fallbackQrUrl);
    }
  };

  // ฟังก์ชันสร้างรูปภาพและ upload เพื่อให้ QR Code ลิงก์ไป
  const generateImageForQR = async () => {
    if (!selectedMeter) return;
    
    try {
      // สร้างรูปภาพจาก A4 container
      const a4Container = document.querySelector('.a4-container') as HTMLElement;
      if (!a4Container) return;

      console.log('📸 Creating image for QR Code...');
      
      // ซ่อนปุ่มและ QR Code ชั่วคราว
      const closeButton = a4Container.querySelector('button') as HTMLElement;
      const printSection = a4Container.querySelector('.p-4.border-t.bg-gray-50') as HTMLElement;
      const qrSection = a4Container.querySelector('.flex.flex-col.items-center.justify-center.py-4') as HTMLElement;
      
      if (closeButton) closeButton.style.display = 'none';
      if (printSection) printSection.style.display = 'none';
      if (qrSection) qrSection.style.display = 'none';

      // เก็บค่า style เดิม
      const originalOverflow = a4Container.style.overflow;
      const originalMaxWidth = a4Container.style.maxWidth;
      const originalMaxHeight = a4Container.style.maxHeight;
      
      // ปรับ style
      a4Container.style.overflow = 'visible';
      a4Container.style.maxWidth = 'none';
      a4Container.style.maxHeight = 'none';

      // รอให้ DOM update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture รูปภาพ
      const canvas = await html2canvas(a4Container, { 
        scale: 1.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123
      });
      
      // คืนค่า style
      a4Container.style.overflow = originalOverflow;
      a4Container.style.maxWidth = originalMaxWidth;
      a4Container.style.maxHeight = originalMaxHeight;
      
      if (closeButton) closeButton.style.display = '';
      if (printSection) printSection.style.display = '';
      if (qrSection) qrSection.style.display = '';

      // แปลงเป็น base64
      const imageDataUrl = canvas.toDataURL('image/png');
      
      // สร้าง blob และ URL สำหรับรูปภาพ
      const base64Data = imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // สร้าง Object URL สำหรับรูปภาพ
      const imageUrl = URL.createObjectURL(blob);
      
      // สร้าง URL สั้นๆ สำหรับ QR Code (ใช้ localhost หรือ domain ของเรา)
      const shortUrl = `${window.location.origin}/billing-image/${selectedMeter.meterName}-${Date.now()}`;
      
      // เก็บ mapping ระหว่าง short URL กับ image data ใน localStorage (สำหรับ demo)
      localStorage.setItem(`billing-image-${selectedMeter.meterName}-${Date.now()}`, imageDataUrl);
      
      // สร้าง QR Code ที่ลิงก์ไปยัง URL สั้น
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shortUrl)}`;
      
      setQrCodeUrl(qrUrl);
      
      console.log('📸 QR Code created with short URL:', shortUrl);
      console.log('📸 Image stored in localStorage for demo purposes');
      
    } catch (error) {
      console.error('Error creating image for QR:', error);
      
      // Fallback: ใช้ข้อความธรรมดา
      const fallbackData = `${selectedMeter.meterName} Total Paid ${formatNumber(selectedMeter.grandTotal ?? 0)}`;
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(fallbackData)}`;
      setQrCodeUrl(fallbackQrUrl);
    }
  };
  
  // ฟังก์ชันดึงข้อมูล Grand Total ย้อนหลัง 1 เดือน
  const fetchPreviousMonthData = async () => {
    if (!selectedMeter || !dateFrom || !dateTo) return;
    
    try {
      // คำนวณช่วงเวลาย้อนหลัง 1 เดือน
      const currentStart = new Date(dateFrom);
      const currentEnd = new Date(dateTo);
      
      // ย้อนไป 1 เดือน
      const previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      
      const previousEnd = new Date(currentEnd);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
      
      // สร้าง label สำหรับกราฟ
      const currentLabel = `${currentStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
      const previousLabel = `${previousStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
      
      // ข้อมูลปัจจุบัน
      const currentTotal = selectedMeter.grandTotal ?? 0;
      
      // จำลองข้อมูลย้อนหลัง (ในการใช้งานจริงควรดึงจาก API)
      // สำหรับ demo ใช้ค่าสุ่มที่สมเหตุสมผล
      const previousTotal = currentTotal * (0.8 + Math.random() * 0.4); // ±20% ของค่าปัจจุบัน
      
      setChartData({
        current: currentTotal,
        previous: previousTotal,
        currentLabel,
        previousLabel
      });
      
    } catch (error) {
      console.error('Error fetching previous month data:', error);
    }
  };
  
  // ฟังก์ชันสร้างกราฟแท่งด้วย Canvas (แบบยาว ไม่มีขอบ)
  const createBarChart = (canvasRef: HTMLCanvasElement, data: typeof chartData) => {
    if (!data || !canvasRef) return;
    
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    const { current, previous, currentLabel, previousLabel } = data;
    const maxValue = Math.max(current, previous);
    const padding = 15;
    const chartWidth = canvasRef.width - (padding * 2);
    const chartHeight = canvasRef.height - (padding * 2);
    const barWidth = chartWidth / 4;
    const barSpacing = chartWidth / 6;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // Set font
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    
    // Draw bars (ไม่มี title)
    const drawBar = (x: number, height: number, color: string, label: string, value: number) => {
      const barHeight = (height / maxValue) * chartHeight;
      const barY = canvasRef.height - padding - barHeight;
      
      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, barY, barWidth, barHeight);
      
      // Draw value on top of bar
      ctx.fillStyle = '#374151';
      ctx.font = '8px Arial';
      const shortValue = value > 1000 ? `${(value/1000).toFixed(1)}k` : value.toFixed(0);
      ctx.fillText(shortValue, x + barWidth / 2, barY - 3);
      
      // Draw label below bar
      ctx.font = '8px Arial';
      ctx.fillText(label, x + barWidth / 2, canvasRef.height - 5);
    };
    
    // Previous month bar (blue) - ปรับตำแหน่งให้กระจายมากขึ้น
    const prevX = padding + barSpacing;
    drawBar(prevX, previous, '#3B82F6', previousLabel, previous);
    
    // Current month bar (green)
    const currX = padding + barSpacing * 2.5 + barWidth;
    drawBar(currX, current, '#10B981', currentLabel, current);
  };
  
  // Generate QR Code และดึงข้อมูลกราฟเมื่อ component mount หรือ selectedMeter เปลี่ยน
  useEffect(() => {
    if (selectedMeter) {
      generatePDFAndQRCode();
      fetchPreviousMonthData();
    }
  }, [selectedMeter, dateFrom, dateTo]);
  
  const handleExport = async (type: 'pdf' | 'csv' | 'image' | 'text') => {
    if (!selectedMeter) return;
    
    try {
      if (type === 'pdf') {
        await exportCalculationToPDF();
      } else if (type === 'csv') {
        exportCalculationToCSV();
      } else if (type === 'image') {
        await exportCalculationToImage();
      } else if (type === 'text') {
        exportCalculationToText();
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };
  
  const handleSendReport = async (payload: SendReportPayload) => {
    console.log('📧 Send report from CalculationModal:', payload);
    
    if (!selectedMeter) {
      showErrorToast('No meter data available');
      return;
    }

    try {
      // ดึงข้อมูล email/line lists
      let targetUsers: any[] = [];
      
      if (payload.type === 'email') {
        if (payload.emailListId) {
          // ส่งให้ user คนเดียว
          const user = emailDataCtx?.emailList?.find((u: any) => u.id === payload.emailListId);
          if (!user || !user.email) {
            showErrorToast('Selected email not found');
            return;
          }
          targetUsers = [user];
        } else if (payload.emailGroupId) {
          // ส่งให้ทั้ง group
          const { apiClient } = await import('@/services/api');
          const groupUsersResponse = await apiClient.getUsersByGroup(payload.emailGroupId);
          
          if (!groupUsersResponse.success || !groupUsersResponse.data) {
            showErrorToast('Failed to fetch group members');
            return;
          }
          
          targetUsers = groupUsersResponse.data.filter((user: any) => 
            user.email && user.email.trim() !== ''
          );
          
          if (targetUsers.length === 0) {
            showErrorToast('No users with email found in the selected group');
            return;
          }
        }
        
        // ส่งอีเมลให้แต่ละคน
        for (const user of targetUsers) {
          await sendCalculationEmail(user, payload.exportType || 'pdf');
        }
        
      } else if (payload.type === 'line') {
        if (payload.lineListId) {
          // ส่งให้ user คนเดียว
          const user = emailDataCtx?.lineList?.find((u: any) => u.id === payload.lineListId);
          if (!user || !user.lineId) {
            showErrorToast('Selected LINE user not found');
            return;
          }
          targetUsers = [user];
        } else if (payload.lineGroupId) {
          // ส่งให้ทั้ง group
          const { apiClient } = await import('@/services/api');
          const groupUsersResponse = await apiClient.getUsersByLineGroup(payload.lineGroupId);
          
          if (!groupUsersResponse.success || !groupUsersResponse.data) {
            showErrorToast('Failed to fetch LINE group members');
            return;
          }
          
          targetUsers = groupUsersResponse.data.filter((user: any) => 
            user.lineId && user.lineId.trim() !== ''
          );
          
          if (targetUsers.length === 0) {
            showErrorToast('No users with LINE ID found in the selected group');
            return;
          }
        }
        
        // ส่ง LINE message ให้แต่ละคน (เฉพาะ text export)
        if (payload.exportType === 'text') {
          for (const user of targetUsers) {
            await sendCalculationLineMessage(user);
          }
        } else {
          showErrorToast('LINE messaging only supports text format');
          return;
        }
      }
      
      showSuccessToast(`Report sent successfully to ${targetUsers.length} recipient(s)`);
      
    } catch (error) {
      console.error('❌ Error sending report from CalculationModal:', error);
      showErrorToast('Failed to send report: ' + (error as Error).message);
    }
  };

  // ฟังก์ชันสร้าง CSV data
  const generateCSVData = () => {
    if (!selectedMeter) return '';
    
    const headers = [
      'Meter Name',
      'Class', 
      'On Peak Demand (W)',
      'Off Peak Demand (W)',
      'On Peak Import (Wh)',
      'Off Peak Import (Wh)',
      'Total kWh',
      'Wh Charge (THB)',
      'Demand Charge (THB)',
      'Power Factor (THB)',
      'FT (THB)',
      'Service Charge (THB)',
      'Total (THB)',
      'VAT (THB)',
      'Grand Total (THB)'
    ];
    
    const row = [
      selectedMeter.meterName || '',
      selectedMeter.class || '',
      (selectedMeter.onPeakDemandW || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.offPeakDemandW || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.onPeakImportWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.offPeakImportWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.totalKWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.whCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.demandCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.powerFactorTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.ft || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.serviceCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.vat || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (selectedMeter.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
    ];
    
    return `${headers.join(',')}\n${row.join(',')}`;
  };

  // ฟังก์ชันสร้าง Text data
  const generateTextData = () => {
    if (!selectedMeter) return '';
    
    const dateRange = formatDateRange();
    const timeRange = `${timeFrom} - ${timeTo}`;
    
    return `
WEBMETER BILLING REPORT
=======================

Meter Information:
- Meter Name: ${selectedMeter.meterName || 'N/A'}
- Class: ${selectedMeter.class || 'N/A'}
- Date : ${dateRange}
- Time : ${timeRange}

Demand Information:
- On Peak Demand: ${(selectedMeter.onPeakDemandW || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} W
- Off Peak Demand: ${(selectedMeter.offPeakDemandW || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} W

Energy Information:
- On Peak Import: ${(selectedMeter.onPeakImportWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Wh
- Off Peak Import: ${(selectedMeter.offPeakImportWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Wh
- Total kWh: ${(selectedMeter.totalKWh || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} kWh

Billing Information:
- Wh Charge: ${(selectedMeter.whCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- Demand Charge: ${(selectedMeter.demandCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- Power Factor Charge: ${(selectedMeter.powerFactorTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- FT Charge: ${(selectedMeter.ft || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- Service Charge: ${(selectedMeter.serviceCharge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB

Total Calculation:
- Subtotal: ${(selectedMeter.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- VAT (7%): ${(selectedMeter.vat || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
- Grand Total: ${(selectedMeter.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB

Generated on: ${new Date().toLocaleString('en-GB')}
    `.trim();
  };

  // ฟังก์ชันส่งอีเมลแยกต่างหาก
  const sendCalculationEmail = async (user: any, exportType: string) => {
    const { apiClient } = await import('@/services/api');
    
    let attachmentData = null;
    
    // สร้างไฟล์แนบตาม export type
    if (exportType === 'pdf') {
      // สร้าง PDF เหมือนกับ exportCalculationToPDF
      const modalElement = document.querySelector('.calculation-modal-content') as HTMLElement;
      if (!modalElement) throw new Error('Modal element not found');

      // ซ่อนปุ่มชั่วคราว
      const closeButton = modalElement.querySelector('button') as HTMLElement;
      const printSection = modalElement.querySelector('.p-4.border-t.bg-gray-50') as HTMLElement;
      
      if (closeButton) closeButton.style.display = 'none';
      if (printSection) printSection.style.display = 'none';

      // เก็บค่า style เดิม (รวมทั้ง computed style)
      const computedStyle = window.getComputedStyle(modalElement);
      const originalOverflow = modalElement.style.overflow;
      const originalMaxHeight = modalElement.style.maxHeight;
      const originalHeight = modalElement.style.height;
      const originalWidth = modalElement.style.width || computedStyle.width;
      
      // ปรับ style ให้แสดงเนื้อหาทั้งหมดและขนาด A4 สำหรับ export
      modalElement.style.overflow = 'visible';
      modalElement.style.maxHeight = 'none';
      modalElement.style.height = 'auto';
      modalElement.style.width = '210mm'; // บังคับให้เป็น A4 width สำหรับ export

      // รอให้ DOM update และ fonts โหลดเสร็จ (เพิ่มเวลา)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Capture
      const canvas = await html2canvas(modalElement, { 
        scale: 1.0,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: modalElement.scrollWidth,
        windowHeight: modalElement.scrollHeight,
        width: modalElement.scrollWidth,
        height: modalElement.scrollHeight
      });
      
      // คืนค่า style
      modalElement.style.overflow = originalOverflow;
      modalElement.style.maxHeight = originalMaxHeight;
      modalElement.style.height = originalHeight;
      modalElement.style.width = originalWidth;
      
      if (closeButton) closeButton.style.display = '';
      if (printSection) printSection.style.display = '';

      // สร้าง PDF A4 แนวตั้ง
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // ใช้หน้า A4 เต็มขนาด (ไม่เว้นขอบ)
      const availableWidth = pdfWidth;
      const availableHeight = pdfHeight;
      
      // คำนวณขนาดให้เต็มหน้า A4
      const ratioWidth = availableWidth / imgWidth;
      const ratioHeight = availableHeight / imgHeight;
      const ratio = Math.min(ratioWidth, ratioHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      attachmentData = pdf.output('datauristring');
      
    } else if (exportType === 'image') {
      // สร้าง Image ใช้ A4 container เหมือนกับ exportCalculationToImage
      const a4Container = document.querySelector('.a4-container') as HTMLElement;
      if (!a4Container) throw new Error('A4 container not found');

      console.log('📧 Starting A4 Image export for email...');
      
      // ซ่อนปุ่มชั่วคราว
      const closeButton = a4Container.querySelector('button') as HTMLElement;
      const printSection = a4Container.querySelector('.p-4.border-t.bg-gray-50') as HTMLElement;
      
      if (closeButton) closeButton.style.display = 'none';
      if (printSection) printSection.style.display = 'none';

      // เก็บค่า style เดิมของ A4 container
      const originalOverflow = a4Container.style.overflow;
      const originalMaxWidth = a4Container.style.maxWidth;
      const originalMaxHeight = a4Container.style.maxHeight;
      
      // ปรับ A4 container ให้แสดงเนื้อหาทั้งหมด
      a4Container.style.overflow = 'visible';
      a4Container.style.maxWidth = 'none';
      a4Container.style.maxHeight = 'none';

      // รอให้ DOM update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (document.fonts) {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Capture A4 container - ใช้ logic เดียวกันกับ exportCalculationToImage
      const canvas = await html2canvas(a4Container, { 
        scale: 1.5, // เพิ่ม scale เล็กน้อยสำหรับความชัดเจน
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 794,  // A4 width in pixels at 96 DPI (210mm)
        height: 1123, // A4 height in pixels at 96 DPI (297mm)
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
          // บังคับใช้ system fonts และปรับ A4 container
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
            }
            .a4-container {
              width: 794px !important;
              height: 1123px !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      // คืนค่า style
      a4Container.style.overflow = originalOverflow;
      a4Container.style.maxWidth = originalMaxWidth;
      a4Container.style.maxHeight = originalMaxHeight;
      
      if (closeButton) closeButton.style.display = '';
      if (printSection) printSection.style.display = '';

      attachmentData = canvas.toDataURL('image/png');
      
      console.log('📧 A4 Image created for email:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        expectedA4Width: 794 * 1.5,
        expectedA4Height: 1123 * 1.5
      });
      
    } else if (exportType === 'csv') {
      // สร้าง CSV data เหมือนกับ exportCalculationToCSV
      console.log('📄 Creating CSV data for email...');
      
      const csvData = [
        ['WEBMETER'],
        ['Contact: 086-341-2503 , 097 243 0376'],
        ['Website: www.webmeter.in.th'],
        [''],
        ['Meter Name', selectedMeter.meterName],
        [`${currentTexts.meterType}`, selectedMeter.class],
        ['Period', formatDateRange()],
        ['Generated', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        [''],
        ['Peak/Off Peak Table'],
        ['On Peak Wh', 'Off Peak Wh', 'On Peak Demand', 'Off Peak Demand', 'Total'],
        [
          formatNumber(selectedMeter.onPeakWhCharge ?? 0),
          formatNumber(selectedMeter.offPeakWhCharge ?? 0), 
          formatNumber(selectedMeter.onPeakDemandCharge ?? 0),
          formatNumber(selectedMeter.offPeakDemandCharge ?? 0),
          formatNumber(selectedMeter.totalcharge ?? (
            (selectedMeter.onPeakWhCharge ?? 0) +
            (selectedMeter.offPeakWhCharge ?? 0) +
            (selectedMeter.onPeakDemandCharge ?? 0) +
            (selectedMeter.offPeakDemandCharge ?? 0)
          ))
        ],
        [''],
        ['TOU Rate Information'],
        [currentTexts.touTitle],
        [`${currentTexts.peak.title} ${currentTexts.peak.time}`],
        [`${currentTexts.peak.days1} ${currentTexts.peak.days2}`],
        [`${currentTexts.offPeak.title} ${currentTexts.offPeak.time1}`],
        [currentTexts.offPeak.days1],
        [currentTexts.offPeak.time2],
        [`${currentTexts.offPeak.days2} ${currentTexts.offPeak.days3}`],
        [`${currentTexts.offPeak.days4} ${currentTexts.offPeak.days5}`],
        [''],
        ['Calculation Details'],
        ['Item', 'Amount'],
        ['Total Kwh', formatNumber(selectedMeter.totalKWh ?? 0)],
        ['Total Wh Charge', formatNumber(selectedMeter.totalwhcharge ?? ((selectedMeter.onPeakWhCharge ?? 0) + (selectedMeter.offPeakWhCharge ?? 0)))],
        ['Total Demand Charge', formatNumber(selectedMeter.totaldemandcharge ?? ((selectedMeter.onPeakDemandCharge ?? 0) + (selectedMeter.offPeakDemandCharge ?? 0)))],
        ['Power Factor', (selectedMeter.powerFactorTotal ?? 0).toFixed(3)],
        ['FT', formatNumber(selectedMeter.ft ?? 0)],
        ['Service Charge', formatNumber(selectedMeter.serviceCharge ?? 0)],
        ['Total', formatNumber(selectedMeter.total ?? 0)],
        ['VAT (7%)', formatNumber(selectedMeter.vat ?? 0)],
        ['Grand Total', formatNumber(selectedMeter.grandTotal ?? 0)],
        [''],
        ['Footer'],
        ['WEBMETER'],
        ['www.webmeter.in.th'],
        ['TOTAL Paid', formatNumber(selectedMeter.grandTotal ?? 0)]
      ];
      
      // แปลงเป็น CSV string เหมือนกับ download
      const csvString = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      attachmentData = csvString;
      
      console.log('📄 CSV data created for email, rows:', csvData.length);
      
    } else if (exportType === 'text') {
      // สร้าง Text data
      const textData = generateTextData();
      attachmentData = textData;
    }

    // ส่งอีเมล
    const emailData = {
      to_email: user.email,
      to_name: user.displayName || user.name || user.email,
      subject: `Billing Report - ${selectedMeter.meterName} ${format(new Date(), 'dd/MM/yyyy')}`,
      meterName: selectedMeter.meterName,
      dateRange: formatDateRange(),
      timeRange: `${timeFrom} - ${timeTo}`,
      exportType: exportType,
      reportTitle: `Billing-${selectedMeter.meterName}`,
      attachmentData: attachmentData
    };

    const response = await apiClient.sendCalculationEmail(emailData);
    
    if (!response.success) {
      throw new Error(`Failed to send email to ${user.email}: ${response.error}`);
    }
    
    console.log(`✅ Email sent successfully to ${user.email}`);
  };

  // ฟังก์ชันส่ง LINE message แยกต่างหาก (ใช้ logic เดียวกับ TableData)
  const sendCalculationLineMessage = async (user: any) => {
    // สร้าง text message
    const textMessage = generateTextData();
    
    // ส่ง LINE message ไปยัง external service เหมือน TableData
    try {
      console.log(`📱 Sending LINE message to: ${user.lineId}`);
      
      const response = await fetch('http://localhost:3002/send-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lineId: user.lineId, 
          message: `📊 WebMeter Billing Report\n\n${textMessage}` 
        })
      });
      
      if (!response.ok) {
        throw new Error(`LINE server error for ${user.lineId}`);
      }
      
      console.log(`✅ LINE message sent successfully to ${user.lineId}`);
      
    } catch (error) {
      console.error(`❌ Error sending LINE to ${user.lineId}:`, error);
      throw error;
    }
  };

  // ฟังก์ชันสำหรับ format วันที่
  const formatDateRange = () => {
    const formatDateTime = (date: string | Date | undefined, time: string | undefined) => {
      if (!date) return '';
      
      let dateObj: Date;
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return '';
      }
      
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const day = dateObj.getDate();
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const timeStr = time || '00:00';
      
      return `${day} ${month} ${year} ${timeStr}`;
    };
    
    const fromStr = formatDateTime(dateFrom, timeFrom);
    const toStr = formatDateTime(dateTo, timeTo);
    
    if (fromStr && toStr) return `${fromStr} - ${toStr}`;
    return fromStr || toStr || 'N/A';
  };

  // Export to PDF (ใช้ A4 container โดยตรง)
  const exportCalculationToPDF = async () => {
    const a4Container = document.querySelector('.a4-container') as HTMLElement;
    if (!a4Container) return;

    try {
      console.log('📄 Starting A4 PDF export...');
      
      // ซ่อนปุ่ม close และ print ชั่วคราว
      const closeButton = a4Container.querySelector('button') as HTMLElement;
      const printSection = a4Container.querySelector('.p-4.border-t.bg-gray-50') as HTMLElement;
      
      if (closeButton) closeButton.style.display = 'none';
      if (printSection) printSection.style.display = 'none';

      // เก็บค่า style เดิมของ A4 container
      const originalOverflow = a4Container.style.overflow;
      const originalMaxWidth = a4Container.style.maxWidth;
      const originalMaxHeight = a4Container.style.maxHeight;
      
      // ปรับ A4 container ให้แสดงเนื้อหาทั้งหมด
      a4Container.style.overflow = 'visible';
      a4Container.style.maxWidth = 'none';
      a4Container.style.maxHeight = 'none';

      // รอให้ DOM update และ fonts โหลดเสร็จ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (document.fonts) {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('📄 A4 container dimensions:', {
        width: a4Container.offsetWidth,
        height: a4Container.offsetHeight,
        scrollWidth: a4Container.scrollWidth,
        scrollHeight: a4Container.scrollHeight
      });

      // แทนที่ SVG icons ด้วย text ชั่วคราว (ยกเว้น printer)
      const svgReplacements: { element: Element, originalHTML: string }[] = [];
      const svgElements = a4Container.querySelectorAll('svg');
      svgElements.forEach((svg) => {
        const parent = svg.parentElement;
        if (parent) {
          // ข้าม printer icon ไม่แทนที่
          if (svg.classList.contains('lucide-printer') || 
              svg.getAttribute('data-lucide') === 'printer' ||
              parent.closest('button')?.textContent?.includes('Printer')) {
            return; // ไม่แทนที่ printer icon
          }
          
          svgReplacements.push({ element: svg, originalHTML: svg.outerHTML });
          
          // แทนที่ด้วย text หรือ symbol
          const replacement = document.createElement('span');
          replacement.style.display = 'inline-block';
          replacement.style.width = '1em';
          replacement.style.height = '1em';
          replacement.style.textAlign = 'center';
          replacement.style.fontSize = 'inherit';
          
          // กำหนด symbol ตาม class หรือ context
          if (parent.textContent?.includes('086-341-2503')) {
            replacement.textContent = '📞';
          } else if (parent.textContent?.includes('www.webmeter.in.th')) {
            replacement.textContent = '🌐';
          } else {
            replacement.textContent = '❌';
          }
          
          svg.parentNode?.replaceChild(replacement, svg);
        }
      });

      // Capture A4 container ทั้งหมด - ขนาดตรงกับ A4 เป๊ะๆ
      const canvas = await html2canvas(a4Container, { 
        scale: 1.0, // ไม่ scale เพื่อให้ได้ขนาดจริง
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 794,  // A4 width in pixels at 96 DPI (210mm)
        height: 1123, // A4 height in pixels at 96 DPI (297mm)
        windowWidth: 794,
        windowHeight: 1123,
        ignoreElements: (element) => {
          // ข้าม scrollbar และ elements ที่ไม่ต้องการ
          return element.tagName === 'SCROLLBAR' || 
                 element.classList.contains('scrollbar') ||
                 (element as HTMLElement).style?.position === 'fixed';
        },
        onclone: (clonedDoc) => {
          // บังคับใช้ system fonts และปรับ A4 container
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
            }
            .a4-container {
              width: 794px !important;
              height: 1123px !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      console.log('📄 Canvas created:', {
        width: canvas.width,
        height: canvas.height,
        expectedA4Width: 794,
        expectedA4Height: 1123
      });
      
      // คืนค่า SVG icons กลับ
      svgReplacements.forEach(({ element, originalHTML }) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        const newSvg = tempDiv.firstChild;
        if (newSvg && element.parentNode) {
          element.parentNode.replaceChild(newSvg, element.parentNode.querySelector('span[style*="inline-block"]') || element);
        }
      });
      
      // คืนค่า style เดิม
      a4Container.style.overflow = originalOverflow;
      a4Container.style.maxWidth = originalMaxWidth;
      a4Container.style.maxHeight = originalMaxHeight;
      
      // แสดงปุ่มกลับมา
      if (closeButton) closeButton.style.display = '';
      if (printSection) printSection.style.display = '';

      // สร้าง PDF A4 แนวตั้ง - ใช้ขนาดจริงของ canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // ใช้หน้า A4 เต็มขนาด - ไม่ scale เพราะ canvas ขนาดตรงกับ A4 แล้ว
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Billing-${selectedMeter.meterName}.pdf`);
      
      console.log('📄 PDF saved with A4 dimensions:', {
        pdfWidth,
        pdfHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };

  // Export to CSV
  const exportCalculationToCSV = () => {
    const csvData = [
      ['WEBMETER'],
      ['Contact: 086-341-2503 , 097 243 0376'],
      ['Website: www.webmeter.in.th'],
      [''],
      ['Meter Name', selectedMeter.meterName],
      [`${currentTexts.meterType}`, selectedMeter.class],
      ['Period', formatDateRange()],
      ['Generated', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
      [''],
      ['Peak/Off Peak Table'],
      ['On Peak Wh', 'Off Peak Wh', 'On Peak Demand', 'Off Peak Demand', 'Total'],
      [
        formatNumber(selectedMeter.onPeakWhCharge ?? 0),
        formatNumber(selectedMeter.offPeakWhCharge ?? 0), 
        formatNumber(selectedMeter.onPeakDemandCharge ?? 0),
        formatNumber(selectedMeter.offPeakDemandCharge ?? 0),
        formatNumber(selectedMeter.totalcharge ?? (
          (selectedMeter.onPeakWhCharge ?? 0) +
          (selectedMeter.offPeakWhCharge ?? 0) +
          (selectedMeter.onPeakDemandCharge ?? 0) +
          (selectedMeter.offPeakDemandCharge ?? 0)
        ))
      ],
      [''],
      ['TOU Rate Information'],
      [currentTexts.touTitle],
      [`${currentTexts.peak.title} ${currentTexts.peak.time}`],
      [`${currentTexts.peak.days1} ${currentTexts.peak.days2}`],
      [`${currentTexts.offPeak.title} ${currentTexts.offPeak.time1}`],
      [currentTexts.offPeak.days1],
      [currentTexts.offPeak.time2],
      [`${currentTexts.offPeak.days2} ${currentTexts.offPeak.days3}`],
      [`${currentTexts.offPeak.days4} ${currentTexts.offPeak.days5}`],
      [''],
      ['Calculation Details'],
      ['Item', 'Amount'],
      ['Total Kwh', formatNumber(selectedMeter.totalKWh ?? 0)],
      ['Total Wh Charge', formatNumber(selectedMeter.totalwhcharge ?? ((selectedMeter.onPeakWhCharge ?? 0) + (selectedMeter.offPeakWhCharge ?? 0)))],
      ['Total Demand Charge', formatNumber(selectedMeter.totaldemandcharge ?? ((selectedMeter.onPeakDemandCharge ?? 0) + (selectedMeter.offPeakDemandCharge ?? 0)))],
      ['Power Factor', (selectedMeter.powerFactorTotal ?? 0).toFixed(3)],
      ['FT', formatNumber(selectedMeter.ft ?? 0)],
      ['Service Charge', formatNumber(selectedMeter.serviceCharge ?? 0)],
      ['Total', formatNumber(selectedMeter.total ?? 0)],
      ['VAT (7%)', formatNumber(selectedMeter.vat ?? 0)],
      ['Grand Total', formatNumber(selectedMeter.grandTotal ?? 0)],
      [''],
      ['Footer'],
      ['WEBMETER'],
      ['www.webmeter.in.th'],
      ['TOTAL Paid', formatNumber(selectedMeter.grandTotal ?? 0)]
    ];

    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Billing-${selectedMeter.meterName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Image (ใช้ A4 container)
  const exportCalculationToImage = async () => {
    const a4Container = document.querySelector('.a4-container') as HTMLElement;
    if (!a4Container) return;

    try {
      console.log('🖼️ Starting A4 Image export...');
      
      // ซ่อนปุ่ม close และ print ชั่วคราว
      const closeButton = a4Container.querySelector('button') as HTMLElement;
      const printSection = a4Container.querySelector('.p-4.border-t.bg-gray-50') as HTMLElement;
      
      if (closeButton) closeButton.style.display = 'none';
      if (printSection) printSection.style.display = 'none';

      // เก็บค่า style เดิมของ A4 container
      const originalOverflow = a4Container.style.overflow;
      const originalMaxWidth = a4Container.style.maxWidth;
      const originalMaxHeight = a4Container.style.maxHeight;
      
      // ปรับ A4 container ให้แสดงเนื้อหาทั้งหมด
      a4Container.style.overflow = 'visible';
      a4Container.style.maxWidth = 'none';
      a4Container.style.maxHeight = 'none';

      // รอให้ DOM update และ fonts โหลดเสร็จ
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (document.fonts) {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // แทนที่ SVG icons ด้วย text ชั่วคราว (ยกเว้น printer)
      const svgReplacements: { element: Element, originalHTML: string }[] = [];
      const svgElements = a4Container.querySelectorAll('svg');
      svgElements.forEach((svg) => {
        const parent = svg.parentElement;
        if (parent) {
          // ข้าม printer icon ไม่แทนที่
          if (svg.classList.contains('lucide-printer') || 
              svg.getAttribute('data-lucide') === 'printer' ||
              parent.closest('button')?.textContent?.includes('Printer')) {
            return; // ไม่แทนที่ printer icon
          }
          
          svgReplacements.push({ element: svg, originalHTML: svg.outerHTML });
          
          // แทนที่ด้วย text หรือ symbol
          const replacement = document.createElement('span');
          replacement.style.display = 'inline-block';
          replacement.style.width = '1em';
          replacement.style.height = '1em';
          replacement.style.textAlign = 'center';
          replacement.style.fontSize = 'inherit';
      
          if (parent.textContent?.includes('086-341-2503')) {
            replacement.textContent = '📞';
          } else if (parent.textContent?.includes('www.webmeter.in.th')) {
            replacement.textContent = '🌐';
          } else {
            replacement.textContent = '❌';
          }
          
          svg.parentNode?.replaceChild(replacement, svg);
        }
      });

      // Capture A4 container ทั้งหมด - ขนาดตรงกับ A4 เป๊ะๆ
      const canvas = await html2canvas(a4Container, { 
        scale: 1.5, // เพิ่ม scale เล็กน้อยสำหรับความชัดเจนของรูปภาพ
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 794,  // A4 width in pixels at 96 DPI (210mm)
        height: 1123, // A4 height in pixels at 96 DPI (297mm)
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
          // บังคับใช้ system fonts และปรับ A4 container
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
            }
            .a4-container {
              width: 794px !important;
              height: 1123px !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      // คืนค่า SVG icons กลับ
      svgReplacements.forEach(({ element, originalHTML }) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        const newSvg = tempDiv.firstChild;
        if (newSvg && element.parentNode) {
          element.parentNode.replaceChild(newSvg, element.parentNode.querySelector('span[style*="inline-block"]') || element);
        }
      });
      
      // คืนค่า style เดิม
      a4Container.style.overflow = originalOverflow;
      a4Container.style.maxWidth = originalMaxWidth;
      a4Container.style.maxHeight = originalMaxHeight;
      
      // แสดงปุ่มกลับมา
      if (closeButton) closeButton.style.display = '';
      if (printSection) printSection.style.display = '';
      
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `Billing-${selectedMeter.meterName}.png`;
      a.click();
      
      console.log('🖼️ Image saved with A4 dimensions:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        expectedA4Width: 794 * 1.5, // scaled
        expectedA4Height: 1123 * 1.5 // scaled
      });
      
    } catch (error) {
      console.error('Image export error:', error);
    }
  };

  // Export to Text
  const exportCalculationToText = () => {
    const textData = `
WEBMETER
========

Contact: 086-341-2503 , 097 243 0376
Website: www.webmeter.in.th

Meter Information
-----------------
Meter Name: ${selectedMeter.meterName}
${currentTexts.meterType}: ${selectedMeter.class}
Period: ${formatDateRange()}
Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}

Peak/Off Peak Table
------------------
On Peak Wh      Off Peak Wh     On Peak Demand  Off Peak Demand Total
${formatNumber(selectedMeter.onPeakWhCharge ?? 0).padEnd(15)} ${formatNumber(selectedMeter.offPeakWhCharge ?? 0).padEnd(15)} ${formatNumber(selectedMeter.onPeakDemandCharge ?? 0).padEnd(15)} ${formatNumber(selectedMeter.offPeakDemandCharge ?? 0).padEnd(15)} ${formatNumber(selectedMeter.totalcharge ?? (
  (selectedMeter.onPeakWhCharge ?? 0) +
  (selectedMeter.offPeakWhCharge ?? 0) +
  (selectedMeter.onPeakDemandCharge ?? 0) +
  (selectedMeter.offPeakDemandCharge ?? 0)
))}

${currentTexts.touTitle}
${'='.repeat(currentTexts.touTitle.length)}

${currentTexts.peak.title} ${currentTexts.peak.time}
${currentTexts.peak.days1} ${currentTexts.peak.days2}

${currentTexts.offPeak.title} ${currentTexts.offPeak.time1}
${currentTexts.offPeak.days1}
${currentTexts.offPeak.time2}
${currentTexts.offPeak.days2} ${currentTexts.offPeak.days3}
${currentTexts.offPeak.days4} ${currentTexts.offPeak.days5}

Calculation Details
------------------
Total Kwh:              ${formatNumber(selectedMeter.totalKWh ?? 0)}
Total Wh Charge:        ${formatNumber(selectedMeter.totalwhcharge ?? ((selectedMeter.onPeakWhCharge ?? 0) + (selectedMeter.offPeakWhCharge ?? 0)))}
Total Demand Charge:    ${formatNumber(selectedMeter.totaldemandcharge ?? ((selectedMeter.onPeakDemandCharge ?? 0) + (selectedMeter.offPeakDemandCharge ?? 0)))}
Power Factor:           ${(selectedMeter.powerFactorTotal ?? 0).toFixed(3)}
FT:                     ${formatNumber(selectedMeter.ft ?? 0)}
Service Charge:         ${formatNumber(selectedMeter.serviceCharge ?? 0)}
Total:                  ${formatNumber(selectedMeter.total ?? 0)}
VAT (7%):               ${formatNumber(selectedMeter.vat ?? 0)}
Grand Total:            ${formatNumber(selectedMeter.grandTotal ?? 0)}

Footer
------
WEBMETER
www.webmeter.in.th

TOTAL Paid: ${formatNumber(selectedMeter.grandTotal ?? 0)}
    `;

    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Billing-${selectedMeter.meterName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!isOpen || !selectedMeter) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* A4 Container - ขนาดตรงกับ A4 เป๊ะๆ */}
      <div className="a4-container bg-white shadow-xl" style={{
        width: '210mm',   // A4 width ตายตัว
        height: '297mm',  // A4 height ตายตัว
        maxWidth: '90vw', // จำกัดไม่ให้เกินหน้าจอ
        maxHeight: '90vh',
        overflow: 'hidden', // ซ่อนส่วนที่เกิน
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Scrollable Content Inside A4 */}
        <div className="calculation-modal-content flex-1 overflow-y-auto" style={{
          width: '100%',
          height: '100%'
        }}>
        {/* Header with Logo and Contact Info */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-0">
              <img 
                src="/Amptron.png" 
                alt="Amptron Logo" 
                className="h-8 w-auto object-contain"
              />
              <div className="pl-0">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800">
                  <span className="text-[#FEB21A]">WEB</span>
                  <span className="text-primary">METER</span>
                </h1>
              </div>
            </div>

            {/* Right side - Contact info and Close button */}
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-end gap-6 text-xs text-gray-700">
                <div className="flex items-center gap-1">
                  <Phone size={12} className="text-gray-600" />
                  <span>086-341-2503 , 097 243 0376</span>
                </div>
                <div className="flex items-center gap-1">
                <a 
                href="http://www.webmeter.in.th/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <Globe size={12} />
                www.webmeter.in.th
              </a>
                </div>
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* ฝั่งซ้าย - ตารางรวม Peak/Off Peak */}
            <div>
              <table className="w-full border-collapse border border-gray-400">
                {/* Header Row */}
                <thead>
                  <tr>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm" rowSpan={2}>
                      Type
                    </th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm" colSpan={2}>
                      On Peak
                    </th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm" colSpan={2}>
                      Off Peak
                    </th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm" rowSpan={2}>
                      Total
                    </th>
                  </tr>
                  <tr>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm">DmW</th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm">kWh</th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm">DmW</th>
                    <th className="bg-gray-300 text-gray-700 font-medium p-2 border border-gray-800 text-sm">kWh</th>
                  </tr>
                </thead>
                {/* Data Rows */}
                <tbody>
                  {/* แถวข้อมูลพลังงาน */}
                  <tr className="bg-white">
                    <td className="p-2 border border-gray-800 text-center text-sm font-medium">
                      Energy
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      {formatNumber(selectedMeter.onPeakDemandW ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      {formatNumber(selectedMeter.onPeakKWh ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      {formatNumber(selectedMeter.offPeakDemandW ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      {formatNumber(selectedMeter.offPeakKWh ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm font-medium">
                      {formatNumber(selectedMeter.totalKWh ?? 0)}
                    </td>
                  </tr>
                  {/* แถวค่าใช้จ่าย */}
                  <tr className="bg-white">
                    <td className="p-2 border border-gray-800 text-center text-sm font-medium">
                      Charge
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      ฿{formatNumber(selectedMeter.onPeakDemandCharge ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      ฿{formatNumber(selectedMeter.onPeakWhCharge ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      ฿{formatNumber(selectedMeter.offPeakDemandCharge ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm">
                      ฿{formatNumber(selectedMeter.offPeakWhCharge ?? 0)}
                    </td>
                    <td className="p-2 border border-gray-800 text-center text-sm font-medium">
                      ฿{formatNumber(selectedMeter.totalcharge ?? (
                        (selectedMeter.onPeakWhCharge ?? 0) +
                        (selectedMeter.offPeakWhCharge ?? 0) +
                        (selectedMeter.onPeakDemandCharge ?? 0) +
                        (selectedMeter.offPeakDemandCharge ?? 0)
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* หมายเหตุข้างล่างตารางที่สอง */}
              <div className="mt-4 text-xs text-red-600 space-y-1">
                <div>{currentTexts.disclaimer.line1}</div>
                <div>{currentTexts.disclaimer.line2}</div>
                <div className="ml-3">{currentTexts.disclaimer.line3}</div>
              </div>

              {/* กล่องข้อมูลช่วงเวลาอัตรา TOU */}
              <div className="mt-6 border-2 border-gray-400 p-4">
                {/* หัวข้อตรงกลาง */}
                <div className="text-center text-sm font-semibold text-gray-800 mb-4">
                  {currentTexts.touTitle}
                </div>
                
                {/* แบ่งสองฝั่ง */}
                <div className="grid grid-cols-2 gap-4">
                  {/* ฝั่งซ้าย - Peak */}
                  <div className="text-xs text-gray-700">
                    <div className="font-semibold text-blue-600 mb-2">{currentTexts.peak.title}</div>
                    <div className="space-y-1">
                      <div>{currentTexts.peak.time}</div>
                      <div>{currentTexts.peak.days1}</div>
                      <div>{currentTexts.peak.days2}</div>
                    </div>
                  </div>
                  
                  {/* ฝั่งขวา - Off Peak */}
                  <div className="text-xs text-gray-700">
                    <div className="font-semibold text-green-600 mb-2">{currentTexts.offPeak.title}</div>
                    <div className="space-y-1">
                      <div>{currentTexts.offPeak.time1}</div>
                      <div>{currentTexts.offPeak.days1}</div>
                      <div className="mt-2">{currentTexts.offPeak.time2}</div>
                      <div>{currentTexts.offPeak.days2}</div>
                      <div>{currentTexts.offPeak.days3}</div>
                      <div>{currentTexts.offPeak.days4}</div>
                      <div>{currentTexts.offPeak.days5}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* ฝั่งขวา - การคำนวณค่าไฟฟ้า */}
            <div className="bg-gray-50 rounded-lg p-4">
              {/* ชื่อมิเตอร์ตัวใหญ่ ตรงกลางฝั่งขวา */}
              <div className="mb-4">
                <div className="text-2xl md:text-xl font-extrabold text-gray-800 text-center">
                  {selectedMeter.meterName}
                </div>
                {/* แถบสีเทาคาด ใต้ชื่อ บอกประเภท */}
                <div className="mt-2 bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded text-center">
                  {currentTexts.meterType}: {selectedMeter.class}
                </div>
                {/* วันที่และเวลา From - To ชิดขวา */}
                {(dateFrom || dateTo) && (
                  <div className="mt-2 text-right text-xs text-gray-600">
                    {(() => {
                      const formatDateTime = (date?: Date, time?: string) => {
                        if (!date) return '';
                        const day = date.getDate();
                        const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
                        const year = date.getFullYear();
                        const timeStr = time || '00:00';
                        return `${day} ${month} ${year} ${timeStr}`;
                      };
                      
                      const fromStr = formatDateTime(dateFrom, timeFrom);
                      const toStr = formatDateTime(dateTo, timeTo);
                      
                      if (fromStr && toStr) return `${fromStr} - ${toStr}`;
                      return fromStr || toStr;
                    })()}
                  </div>
                )}
              </div>

              {/* ฝั่งขวา - รายละเอียดการคำนวณค่าไฟฟ้า */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Total Kwh</span>
                  <span className="font-medium">{formatNumber(selectedMeter.totalKWh ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Total Wh Charge</span>
                  <span className="font-medium">{formatNumber(selectedMeter.totalwhcharge ?? (
                        (selectedMeter.onPeakWhCharge ?? 0) +
                        (selectedMeter.offPeakWhCharge ?? 0)
                      ))}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Total Demand Charge</span>
                  <span className="font-medium">{formatNumber(selectedMeter.totaldemandcharge ?? (
                        (selectedMeter.onPeakDemandCharge ?? 0) +
                        (selectedMeter.offPeakDemandCharge ?? 0) 
                      ))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Power Factor</span>
                  <span className="font-medium">{formatNumber(selectedMeter.powerFactorTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">FT</span>
                  <span className="font-medium">{formatNumber(selectedMeter.ft ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Service Charge</span>
                  <span className="font-medium">{formatNumber(selectedMeter.serviceCharge ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Total</span>
                  <span className="font-medium">{formatNumber(selectedMeter.total ?? (
                        (selectedMeter.whCharge ?? 0) +
                        (selectedMeter.demandCharge ?? (
                          (selectedMeter.onPeakDemandCharge ?? 0) +
                          (selectedMeter.offPeakDemandCharge ?? 0)
                        )) +
                        (selectedMeter.ft ?? 0) +
                        (selectedMeter.serviceCharge ?? 0)
                      ))}
                  </span>
                </div>
                
                {/* เส้นคั่น */}
                <div className="border-t-2 border-gray-400 my-3"></div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">VAT (7%)</span>
                  <span className="font-medium">{formatNumber(selectedMeter.vat ?? (
                        (selectedMeter.total ?? (
                          (selectedMeter.whCharge ?? 0) +
                          (selectedMeter.demandCharge ?? (
                            (selectedMeter.onPeakDemandCharge ?? 0) +
                            (selectedMeter.offPeakDemandCharge ?? 0)
                          )) +
                          (selectedMeter.ft ?? 0) +
                          (selectedMeter.serviceCharge ?? 0)
                        )) * 0.07
                      ))}
                  </span>
                </div>
                
                {/* เส้นคั่น */}
                <div className="border-t-2 border-gray-400 my-3"></div>
                
                <div className="flex justify-between items-center py-3 bg-blue-100 px-3 rounded font-bold text-blue-800">
                  <span>Grand Total</span>
                  <span className="font-medium">{formatNumber(selectedMeter.grandTotal ?? (
                        (selectedMeter.total ?? (
                          (selectedMeter.whCharge ?? 0) +
                          (selectedMeter.demandCharge ?? (
                            (selectedMeter.onPeakDemandCharge ?? 0) +
                            (selectedMeter.offPeakDemandCharge ?? 0)
                          )) +
                          (selectedMeter.ft ?? 0) +
                          (selectedMeter.serviceCharge ?? 0)
                        )) +
                        (selectedMeter.vat ?? (
                          (selectedMeter.total ?? (
                            (selectedMeter.whCharge ?? 0) +
                            (selectedMeter.demandCharge ?? (
                              (selectedMeter.onPeakDemandCharge ?? 0) +
                              (selectedMeter.offPeakDemandCharge ?? 0)
                            )) +
                            (selectedMeter.ft ?? 0) +
                            (selectedMeter.serviceCharge ?? 0)
                          )) * 0.07
                        ))
                      ))}
                  </span>
                </div>
                
                {/* กราฟแท่งเปรียบเทียบ Grand Total */}
                {chartData && (
                  <div className="mt-3 relative">
                    <canvas
                      ref={(canvas) => {
                        if (canvas && chartData) {
                          canvas.width = 280;
                          canvas.height = 80;
                          createBarChart(canvas, chartData);
                        }
                      }}
                      className="w-full h-auto"
                      style={{ maxHeight: '80px', maxWidth: '280px' }}
                    />
                    {/* เปอร์เซ็นต์อยู่ฝั่งขวาสุดของกราฟ */}
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
                      {chartData.current > chartData.previous ? (
                        <span className="text-red-600 text-xs font-bold">
                          ↑ {(((chartData.current - chartData.previous) / chartData.previous) * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs font-bold">
                          ↓ {(((chartData.previous - chartData.current) / chartData.previous) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* ขีดคั่นข้างล่างสุด */}
        <div className="border-t-2 border-dashed border-gray-600 w-full my-2"></div>
        
        {/* ส่วนข้อมูลข้างล่างขีดคั่น */}
        <div className="p-6 flex justify-between items-start">
          {/* ฝั่งซ้าย - WEBMETER */}
          <div className="text-left">
            <div className="text-2xl font-bold text-gray-800 mb-2 ">
              <span className="text-[#FEB21A]">WEB</span>
              <span className="text-primary">METER</span>
            </div>
            <div className="mt-16">
              <a 
                href="http://www.webmeter.in.th/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <Globe size={14} />
                www.webmeter.in.th
              </a>
            </div>
          </div>

          {/* QR Code - Center */}
          <div className="flex flex-col items-center justify-center py-4 ">
            <div className="bg-white p-2 rounded-lg border-2 border-gray-300 shadow-md">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl}
                  alt="QR Code for PDF Report"
                  className="w-24 h-24"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  Generating...
                </div>
              )}
            </div>
          
          </div>
            
          
          {/* ฝั่งขวาสุด - ข้อมูลมิเตอร์ วันเวลา และ TOTAL Paid */}
          <div className="text-right">
            {/* ข้อมูลมิเตอร์ */}
            <div className="text-sm text-gray-700 mb-2">
              <span className="font-medium">{selectedMeter.meterName}</span>  {currentTexts.meterType} <span className="font-medium">{selectedMeter.class}</span>
            </div>
            
            {/* วันเวลา */}
            <div className="text-xs text-gray-600 mt-2 text-center">
              {(() => {
                const formatDateTime = (date: string | Date | undefined, time: string | undefined) => {
                  if (!date) return '';
                  
                  let dateObj: Date;
                  if (typeof date === 'string') {
                    dateObj = new Date(date);
                  } else if (date instanceof Date) {
                    dateObj = date;
                  } else {
                    return '';
                  }
                  
                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  
                  const day = dateObj.getDate();
                  const month = months[dateObj.getMonth()];
                  const year = dateObj.getFullYear();
                  const timeStr = time || '00:00';
                  
                  return `${day} ${month} ${year} ${timeStr}`;
                };
                
                const fromStr = formatDateTime(dateFrom, timeFrom);
                const toStr = formatDateTime(dateTo, timeTo);
                
                if (fromStr && toStr) return `${fromStr} - ${toStr}`;
                return fromStr || toStr;
              })()}
            </div>
            
           
            
            {/* TOTAL Paid */}
            <div className="border-2 border-gray-400 w60 h-20 overflow-hidden">
              <div className="bg-gray-200 border-b border-gray-400 px-4 py-2">
                <div className="text-sm font-semibold text-gray-700">TOTAL Paid</div>
              </div>
              <div className="px-4 py-3 bg-white">
                <div className="text-lg font-bold text-gray-800">
                  {formatNumber(selectedMeter.grandTotal ?? (
                          (selectedMeter.total ?? (
                            (selectedMeter.whCharge ?? 0) +
                            (selectedMeter.demandCharge ?? (
                              (selectedMeter.onPeakDemandCharge ?? 0) +
                              (selectedMeter.offPeakDemandCharge ?? 0)
                            )) +
                            (selectedMeter.ft ?? 0) +
                            (selectedMeter.serviceCharge ?? 0)
                          )) +
                          (selectedMeter.vat ?? (
                            (selectedMeter.total ?? (
                              (selectedMeter.whCharge ?? 0) +
                              (selectedMeter.demandCharge ?? (
                                (selectedMeter.onPeakDemandCharge ?? 0) +
                                (selectedMeter.offPeakDemandCharge ?? 0)
                              )) +
                              (selectedMeter.ft ?? 0) +
                              (selectedMeter.serviceCharge ?? 0)
                            )) * 0.07
                          ))
                        ))}
                </div>
              </div>
            </div>

            
          </div>
        </div>

        
        
        <div className="p-4 border-t bg-gray-50 flex justify-center">
           <Button 
            onClick={handlePrintClick}
            className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-gray-200 shadow flex items-center ml-1" variant="outline">
              <Printer className="w-4 h-4 mr-0" />
            </Button>
        </div>
        </div>
      </div>
      
      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={handlePrintModalClose}
        onExport={handleExport}
        onSendReport={handleSendReport}
        isLoaded={true}
        hasData={true}
        isLoading={false}
        isSending={false}
        emailGroups={emailDataCtx?.emailGroups || []}
        lineGroups={emailDataCtx?.lineGroups || []}
        emailList={emailDataCtx?.emailList || []}
        lineList={emailDataCtx?.lineList || []}
      />
    </div>
  );
};
