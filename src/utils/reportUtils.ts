import { format } from 'date-fns';
import { apiClient } from '@/services/api';
// ไม่ต้อง import event logging functions อีกต่อไป
// ระบบใหม่ไม่เก็บ export/send report events

// Types for report utilities
export interface ReportData {
  filteredData: any[];
  displayColumns: string[];
  meterName: string;
  dateRange: string;
  timeRange: string;
  filename?: string; // เพิ่มสำหรับชื่อไฟล์ที่ต้องการ
  reportTitle?: string; // เพิ่มสำหรับ backend filename matching
  formatDateTime: (dateTime: string) => string;
  getColumnValue: (row: any, col: string) => string;
  customImageCapture?: () => Promise<string>; // เพิ่มสำหรับ custom image capture
}

export interface SendReportPayload {
  type: 'email' | 'line';
  exportType?: 'pdf' | 'csv' | 'image' | 'text';
  emailListId?: number | null;
  emailGroupId?: number | null;
  lineListId?: number | null;
  lineGroupId?: number | null;
}

export interface ReportGroups {
  emailGroups: { id: number; name: string }[];
  lineGroups: { id: number; name: string }[];
  emailList: any[];
  lineList: any[];
}

// Utility function to handle sending reports (extracted from TableData.tsx)
export async function handleSendReport(
  payload: SendReportPayload,
  reportData: ReportData,
  groups: ReportGroups,
  showSuccessToast: (message: string) => void,
  showErrorToast: (message: string) => void,
  emailDataCtx?: any
): Promise<void> {
  const { 
    filteredData, 
    displayColumns, 
    meterName, 
    dateRange, 
    timeRange, 
    formatDateTime, 
    getColumnValue,
    customImageCapture
  } = reportData;
  
  const { emailGroups, lineGroups, emailList, lineList } = groups;

  if (payload.type === 'email') {
    let targetUsers: any[] = [];
    
    // ตรวจสอบว่าเป็นการส่งแบบ individual หรือ group
    if (payload.emailListId) {
      // ส่งให้ user คนเดียว
      const user = emailList.find(u => u.id === payload.emailListId);
      if (!user || !user.email) throw new Error('Selected email not found');
      targetUsers = [user];
      console.log('Sending to individual user:', user.email);
    } else if (payload.emailGroupId) {
      // ส่งให้ทั้ง group
      const selectedGroup = emailGroups.find(g => g.id === payload.emailGroupId);
      console.log('=== EMAIL GROUP DEBUG ===');
      console.log('Selected Group ID:', payload.emailGroupId);
      console.log('Selected Group Name:', selectedGroup ? selectedGroup.name : 'Group not found');
      console.log('Available Groups:', emailGroups);
      
      const groupUsersResponse = await apiClient.getUsersByGroup(payload.emailGroupId);
      
      if (!groupUsersResponse.success || !groupUsersResponse.data) {
        console.log('❌ Failed to fetch group members:', groupUsersResponse);
        throw new Error('Failed to fetch group members');
      }
      
      console.log('📋 All users in group:', groupUsersResponse.data);
      console.log('📧 Users with email field:', groupUsersResponse.data.map(u => ({ id: u.id, name: u.name || u.username, email: u.email, status: u.status })));
      
      // กรองเฉพาะ user ที่มี email
      targetUsers = groupUsersResponse.data.filter((user: any) => 
        user.email && user.email.trim() !== ''
      );
      
      console.log('✅ Filtered users with valid email:', targetUsers.map(u => ({ id: u.id, name: u.name || u.username, email: u.email })));
      
      if (targetUsers.length === 0) {
        console.log('❌ No users with email found in group:', selectedGroup?.name || payload.emailGroupId);
        throw new Error(`No users with email found in the selected group "${selectedGroup?.name || payload.emailGroupId}"`);
      }
      
      console.log(`✉️ Sending to ${targetUsers.length} users in group "${selectedGroup?.name}": ${targetUsers.map(u => u.email).join(', ')}`);
      console.log('========================');
    } else {
      throw new Error('No email target specified');
    }

    const buildTextTable = () => {
      // Check if this is OnlineData format (has parameterName) or TableData format
      const isOnlineDataFormat = filteredData.length > 0 && filteredData[0].parameterName !== undefined;
      
      if (isOnlineDataFormat) {
        // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
        const header = ['Device Name', ...displayColumns];
        const rows = filteredData.map(row => [
          row.parameterName || 'Unknown Parameter',
          ...displayColumns.map(col => {
            // Use the custom getColumnValue function which handles meter mapping
            const value = getColumnValue(row, col);
            if (value === null || value === undefined || value === '' || value === '-') {
              return '-';
            }
            return value;
          })
        ]);
        
        // Fixed-width simple formatting
        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').toString().length)));
        const fmt = (val: string, i: number) => (val ?? '').toString().padEnd(colWidths[i], ' ');
        const headerLine = header.map(fmt).join(' | ');
        const sepLine = colWidths.map(w => '-'.repeat(w)).join('-+-');
        const bodyLines = rows.map(r => r.map(fmt).join(' | '));
        return [headerLine, sepLine, ...bodyLines].join('\n');
      } else {
        // TableData format: Time | Column 1 | Column 2 | ...
        const header = ['Time', ...displayColumns];
        const rows = filteredData.map(row => [
          formatDateTime(row.reading_timestamp || row.time),
          ...displayColumns.map(col => {
            const value = getColumnValue(row, col);
            if (value === null || value === undefined || value === '' || value === '-') {
              return '0.00';
            }
            return value;
          })
        ]);
        
        // Fixed-width simple formatting
        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').toString().length)));
        const fmt = (val: string, i: number) => (val ?? '').toString().padEnd(colWidths[i], ' ');
        const headerLine = header.map(fmt).join(' | ');
        const sepLine = colWidths.map(w => '-'.repeat(w)).join('-+-');
        const bodyLines = rows.map(r => r.map(fmt).join(' | '));
        return [headerLine, sepLine, ...bodyLines].join('\n');
      }
    };

    const reportTitle = (reportData as any).reportTitle || "WebMeter Report";
    const baseMessage = `"${reportTitle}"\nMeter: ${meterName}\nDate: ${dateRange}\n`;
    const message = payload.exportType === 'text'
      ? `${baseMessage}\n${buildTextTable()}`
      : `${baseMessage}\nColumns: ${displayColumns.join(', ')}\nRows: ${filteredData.length}`;

    // ส่งอีเมลให้ทุกคนใน targetUsers
    const emailPromises = targetUsers.map(async (user) => {
      try {
        // ใช้ nodemailer สำหรับทุก export type รวมถึง text
        if (payload.exportType === 'pdf' || payload.exportType === 'csv' || payload.exportType === 'image' || payload.exportType === 'text') {
          // ใช้ backend API (nodemailer) สำหรับไฟล์ attachment
          console.log(`Sending ${payload.exportType?.toUpperCase()} email to:`, user.email);
          console.log('📧 reportTitle being sent:', reportTitle);
          console.log('📧 isDemandGraphFormat being sent:', reportTitle && reportTitle.includes('Demand Graph'));
          
          // สำหรับ image และ PDF export ที่มี customImageCapture
          let customImageData = null;
          if ((payload.exportType === 'image' || payload.exportType === 'pdf') && customImageCapture) {
            console.log(`📧 Using custom ${payload.exportType} capture for email`);
            try {
              customImageData = await customImageCapture();
              console.log(`📧 Custom ${payload.exportType} captured successfully, data length:`, customImageData?.length);
              if (payload.exportType === 'pdf') {
                console.log(`📧 PDF data preview:`, customImageData?.substring(0, 100));
              }
            } catch (error) {
              console.error(`📧 Custom ${payload.exportType} capture failed:`, error);
              console.error(`📧 Error details:`, error.message);
              // ถ้า custom capture ล้มเหลว ให้ใช้วิธีปกติ
            }
          } else {
            console.log(`📧 No custom capture available for ${payload.exportType}:`, {
              hasCustomImageCapture: !!customImageCapture,
              exportType: payload.exportType
            });
          }
          
          const requestBody = {
            to_email: user.email,
            to_name: user.username || user.name || user.email,
            subject: `WebMeter Report ${format(new Date(), 'dd/MM/yyyy')}`,
            tableData: filteredData,
            columns: displayColumns,
            meterName: meterName,
            dateRange: dateRange,
            timeRange: timeRange,
            exportType: payload.exportType,
            reportTitle: reportTitle, // Send custom report title
            isOnlineDataFormat: filteredData.length > 0 && filteredData[0].parameterName !== undefined, // Add format indicator
            isDemandGraphFormat: reportTitle && reportTitle.includes('Demand Graph'), // Add demand graph indicator
            customImageData: customImageData // เพิ่ม custom image data
          };
          
          const pdfResponse = await fetch('http://localhost:3001/api/email/send-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!pdfResponse.ok) {
            const errorData = await pdfResponse.json();
            const errType = (payload.exportType || 'report').toUpperCase();
            throw new Error(`Failed to send ${errType} email to ${user.email}: ${errorData.message}`);
          }

          const pdfResult = await pdfResponse.json();
          if (!pdfResult.success) throw new Error(`Failed to send email to ${user.email}: ${pdfResult.message}`);
          
          return { success: true, email: user.email };
        } else {
          // ใช้ EmailJS สำหรับ text format
          const { sendEmail } = await import('@/services/emailService');
          
          const emailDetails = `
Date : ${dateRange}
Time : ${timeRange}
Meter: ${meterName}

${payload.exportType === 'text' ? buildTextTable() : message}
          `.trim();

          const resp = await sendEmail({
            to_email: user.email,
            to_name: user.username || user.name || user.email,
            subject: `WebMeter Report ${format(new Date(), 'dd/MM/yyyy')}`,
            message: emailDetails,
            export_type: payload.exportType || 'table-data',
            date_range: dateRange,
            time_range: timeRange,
            meters: meterName,
            parameters: displayColumns.join(', '),
          });
          
          if (!resp.success) throw new Error(`Failed to send email to ${user.email}: ${resp.message}`);
          
          return { success: true, email: user.email };
        }
      } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error);
        return { success: false, email: user.email, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // รอให้ส่งอีเมลทั้งหมดเสร็จ
    const results = await Promise.all(emailPromises);
    
    // ตรวจสอบผลลัพธ์
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0 && failCount === 0) {
      showSuccessToast(`Send Email Successfully to ${successCount} recipient${successCount > 1 ? 's' : ''}`);
      
      // ไม่ log การส่ง email report อีกต่อไป (ระบบใหม่ไม่เก็บ export events)
    } else if (successCount > 0 && failCount > 0) {
      showErrorToast(`Partially sent: ${successCount} successful, ${failCount} failed`);
    } else {
      throw new Error('Failed to send email to all recipients');
    }
  } else if (payload.type === 'line') {
    let targetUsers: any[] = [];
    
    // ตรวจสอบว่าเป็นการส่งแบบ individual หรือ group
    if (payload.lineListId) {
      // ส่งให้ user คนเดียว - ใช้ emailDataCtx เป็นหลัก
      const user = emailDataCtx?.lineList?.find((u: any) => u.id === payload.lineListId)
        || lineList.find(u => u.id === payload.lineListId);
      
      console.log('=== LINE USER DEBUG ===');
      console.log('Looking for user ID:', payload.lineListId);
      console.log('Found user:', user);
      console.log('Available lineList:', lineList);
      console.log('EmailDataCtx lineList:', emailDataCtx?.lineList);
      console.log('EmailDataCtx available:', !!emailDataCtx);
      
      if (!user) {
        console.log('❌ User not found in lineList or EmailDataCtx');
        throw new Error('Selected LINE user not found');
      }
      
      // ลองหา LINE ID ในหลายรูปแบบ
      const resolvedLineId = user.lineId || user.line_id || user.line_messaging_id;
      
      console.log('LINE ID resolution:', {
        lineId: user.lineId,
        line_id: user.line_id,
        line_messaging_id: user.line_messaging_id,
        resolved: resolvedLineId
      });
      
      if (!resolvedLineId || resolvedLineId.trim() === '') {
        console.log('❌ No valid LINE ID found for user:', user);
        throw new Error('Selected LINE ID not found or empty');
      }
      
      targetUsers = [{ ...user, lineId: resolvedLineId }];
      console.log('✅ Sending to individual LINE user:', resolvedLineId);
      console.log('========================');
    } else if (payload.lineGroupId) {
      // ส่งให้ทั้ง group
      const selectedGroup = lineGroups.find(g => g.id === payload.lineGroupId);
      console.log('=== LINE GROUP DEBUG ===');
      console.log('Selected Group ID:', payload.lineGroupId);
      console.log('Selected Group Name:', selectedGroup ? selectedGroup.name : 'Group not found');
      console.log('Available Groups:', lineGroups);
      
      const groupUsersResponse = await apiClient.getUsersByLineGroup(payload.lineGroupId);
      
      if (!groupUsersResponse.success || !groupUsersResponse.data) {
        console.log('❌ Failed to fetch LINE group members:', groupUsersResponse);
        throw new Error('Failed to fetch LINE group members');
      }
      
      console.log('📋 All users in LINE group:', groupUsersResponse.data);
      console.log('📱 Users with LINE ID field:', groupUsersResponse.data.map(u => ({ id: u.id, name: u.name || u.username, line_id: u.line_id, status: u.status })));
      
      // กรองเฉพาะ user ที่มี LINE ID
      targetUsers = groupUsersResponse.data
        .filter((user: any) => user.line_id && user.line_id.trim() !== '')
        .map((user: any) => ({ ...user, lineId: user.line_id }));
      
      console.log('✅ Filtered users with valid LINE ID:', targetUsers.map(u => ({ id: u.id, name: u.name || u.username, lineId: u.lineId })));
      
      if (targetUsers.length === 0) {
        console.log('❌ No users with LINE ID found in group:', selectedGroup?.name || payload.lineGroupId);
        throw new Error(`No users with LINE ID found in the selected group "${selectedGroup?.name || payload.lineGroupId}"`);
      }
      
      console.log(`📱 Sending to ${targetUsers.length} users in LINE group "${selectedGroup?.name}": ${targetUsers.map(u => u.lineId).join(', ')}`);
      console.log('========================');
    } else {
      throw new Error('No LINE target specified');
    }

    // Build detailed message (use table for text type) - reuse the same logic as email
    const buildLineTextTable = () => {
      // Check if this is OnlineData format (has parameterName) or TableData format
      const isOnlineDataFormat = filteredData.length > 0 && filteredData[0].parameterName !== undefined;
      
      if (isOnlineDataFormat) {
        // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
        const header = ['Device Name', ...displayColumns];
        const rows = filteredData.map(row => [
          row.parameterName || 'Unknown Parameter',
          ...displayColumns.map(col => {
            // Use the custom getColumnValue function which handles meter mapping
            const value = getColumnValue(row, col);
            if (value === null || value === undefined || value === '' || value === '-') {
              return '-';
            }
            return value;
          })
        ]);
        
        // Fixed-width simple formatting
        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').toString().length)));
        const fmt = (val: string, i: number) => (val ?? '').toString().padEnd(colWidths[i], ' ');
        const headerLine = header.map(fmt).join(' | ');
        const sepLine = colWidths.map(w => '-'.repeat(w)).join('-+-');
        const bodyLines = rows.map(r => r.map(fmt).join(' | '));
        return [headerLine, sepLine, ...bodyLines].join('\n');
      } else {
        // TableData format: Time | Column 1 | Column 2 | ...
        const header = ['Time', ...displayColumns];
        const rows = filteredData.map(row => [
          formatDateTime(row.reading_timestamp || row.time),
          ...displayColumns.map(col => {
            const value = getColumnValue(row, col);
            if (value === null || value === undefined || value === '' || value === '-') {
              return '0.00';
            }
            return value;
          })
        ]);
        
        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').toString().length)));
        const fmt = (val: string, i: number) => (val ?? '').toString().padEnd(colWidths[i], ' ');
        const headerLine = header.map(fmt).join(' | ');
        const sepLine = colWidths.map(w => '-'.repeat(w)).join('-+-');
        const bodyLines = rows.map(r => r.map(fmt).join(' | '));
        return [headerLine, sepLine, ...bodyLines].join('\n');
      }
    };
    
    const baseMessage = `WebMeter Table Data\nMeter: ${meterName}\nDate: ${dateRange}`;
    const message = payload.exportType === 'text'
      ? `${baseMessage}\n\n${buildLineTextTable()}`
      : `${baseMessage}\nColumns: ${displayColumns.join(', ')}\nRows: ${filteredData.length}`;

    // ส่ง LINE ให้ทุกคนใน targetUsers
    const linePromises = targetUsers.map(async (user) => {
      try {
        console.log(`Sending LINE message to:`, user.lineId);
        const resp = await fetch('http://localhost:3002/send-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: user.lineId, message })
        });
        
        if (!resp.ok) {
          throw new Error(`LINE server error for ${user.lineId}`);
        }
        
        return { success: true, lineId: user.lineId };
      } catch (error) {
        console.error(`Error sending LINE to ${user.lineId}:`, error);
        return { success: false, lineId: user.lineId, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // รอให้ส่ง LINE ทั้งหมดเสร็จ
    const results = await Promise.all(linePromises);
    
    // ตรวจสอบผลลัพธ์
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0 && failCount === 0) {
      showSuccessToast(`Send LINE Successfully to ${successCount} recipient${successCount > 1 ? 's' : ''}`);
      
      // ไม่ log การส่ง LINE report อีกต่อไป (ระบบใหม่ไม่เก็บ export events)
    } else if (successCount > 0 && failCount > 0) {
      showErrorToast(`Partially sent: ${successCount} successful, ${failCount} failed`);
    } else {
      throw new Error('Failed to send LINE to all recipients');
    }
  }
}

// Utility function to fetch email and line groups
export async function fetchReportGroups(): Promise<ReportGroups> {
  try {
    const [emailResponse, lineResponse, usersResponse] = await Promise.all([
      apiClient.getEmailGroups(),
      apiClient.getLineGroups(),
      apiClient.getUsers({
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'ASC'
      })
    ]);
    
    const emailGroups = emailResponse.success ? (emailResponse.data || []) : [];
    const lineGroups = lineResponse.success ? (lineResponse.data || []) : [];
    
    let emailList: any[] = [];
    let lineList: any[] = [];
    
    if (usersResponse.success) {
      const users = usersResponse.data || [];
      
      // Transform users to EmailRow format (like in Email.tsx)
      const transformedUsers = users.map((user: any) => ({
        id: user.id,
        displayName: user.username || '',
        email: user.email || '',
        groups: user.group_name ? [user.group_name] : [],
        line_groups: user.line_group_name ? [user.line_group_name] : [],
        name: `${user.name || ''} ${user.surname || ''}`.trim(),
        phone: user.phone || '',
        lineId: user.line_id || '',
        enabled: user.status === 'active'
      }));
      
      // Filter email users (users with email)
      emailList = transformedUsers.filter((user: any) => user.email && user.email.trim() !== '');
      
      // Filter line users (users with lineId)
      lineList = transformedUsers.filter((user: any) => user.lineId && user.lineId.trim() !== '');
    }
    
    return {
      emailGroups,
      lineGroups,
      emailList,
      lineList
    };
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return {
      emailGroups: [],
      lineGroups: [],
      emailList: [],
      lineList: []
    };
  }
}
