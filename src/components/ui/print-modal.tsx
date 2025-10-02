import React, { useState, useEffect } from 'react';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Printer,
  FileText,
  Image as ImageIcon,
  Download,
  Mail,
  Send,
  FileSpreadsheet,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { useEmailData } from '@/context/EmailDataContext';
import { Alert, AlertDescription } from './alert';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: 'pdf' | 'csv' | 'image' | 'text') => void;
  onSendReport?: (payload: { 
    type: 'email' | 'line';
    exportType?: 'pdf' | 'csv' | 'image' | 'text';
    emailListId?: number | null;
    emailGroupId?: number | null;
    lineListId?: number | null;
    lineGroupId?: number | null;
  }) => void;
  isLoaded: boolean;
  hasData: boolean;
  isLoading: boolean;
  isSending: boolean;
  emailGroups: { id: number; name: string }[];
  lineGroups: { id: number; name: string }[];
  emailList: any[];
  lineList: any[];
}


// Helper function to check if user is guest
const isGuestUser = (): boolean => {
  const token = localStorage.getItem('auth_token');
  let levelFromToken = '';
  
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload?.level) levelFromToken = payload.level;
    }
  } catch {}
  
  return (levelFromToken || '').toLowerCase() === 'guest' || localStorage.getItem('isGuest') === 'true';
};

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onSendReport,
  isLoaded,
  hasData,
  isLoading,
  isSending,
  emailGroups,
  lineGroups,
  emailList,
  lineList
}) => {
  // Fallback to EmailDataContext if lists are empty
  const emailDataCtx = (() => {
    try { return useEmailData(); } catch { return null as any; }
  })();
  const effectiveLineList = (lineList && lineList.length > 0)
    ? lineList
    : (emailDataCtx?.lineList || []);
  const effectiveLineGroups = (lineGroups && lineGroups.length > 0)
    ? lineGroups
    : (emailDataCtx?.lineGroups || []);
  const [selectedExportType, setSelectedExportType] = useState<'pdf' | 'csv' | 'image' | 'text' | null>(null);
  const [selectedAction, setSelectedAction] = useState<'download' | 'email' | 'line' | null>(null);
  const [selectedEmailList, setSelectedEmailList] = useState<number | null>(null);
  const [selectedEmailGroup, setSelectedEmailGroup] = useState<number | null>(null);
  const [selectedLineList, setSelectedLineList] = useState<number | null>(null);
  const [selectedLineGroup, setSelectedLineGroup] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedExportType(null);
      setSelectedAction(null);
      setSelectedEmailList(null);
      setSelectedEmailGroup(null);
      setSelectedLineList(null);
      setSelectedLineGroup(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSelectedExportType(null);
    setSelectedAction(null);
    setSelectedEmailList(null);
    setSelectedEmailGroup(null);
    setSelectedLineList(null);
    setSelectedLineGroup(null);
    onClose();
  };

  const handleExport = () => {
    if (selectedExportType) {
      onExport(selectedExportType);
      handleClose();
    }
  };

  const handleSendEmail = () => {
    if (!onSendReport) {
      alert('คุณไม่มีสิทธิ์ในการส่งรายงาน');
      return;
    }
    
    if (selectedEmailList || selectedEmailGroup) {
      const payload = { 
        type: 'email' as const, 
        exportType: selectedExportType || undefined,
        emailListId: selectedEmailList, 
        emailGroupId: selectedEmailGroup 
      };
      console.log('Sending payload:', payload);
      onSendReport(payload);
      handleClose();
    } else {
      alert('กรุณาเลือก Email List หรือ Email Group');
    }
  };

  const handleSendLine = () => {
    if (!onSendReport) {
      alert('คุณไม่มีสิทธิ์ในการส่งรายงาน');
      return;
    }
    
    if (selectedLineList || selectedLineGroup) {
      onSendReport({ 
        type: 'line' as const, 
        exportType: selectedExportType || undefined,
        lineListId: selectedLineList, 
        lineGroupId: selectedLineGroup 
      });
      handleClose();
    } else {
      alert('กรุณาเลือก Line List หรือ Line Group');
    }
  };

  const isGuest = isGuestUser();

  if (!isOpen) return null;

  // Show access denied for Guest users
  if (isGuest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
        <div className="bg-white rounded shadow-lg p-6 min-w-[400px] max-w-lg flex flex-col">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-800 flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              Print Feature Restricted
            </h2>
          </div>
          
          <Alert className="border-red-200 bg-red-50 mb-4">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <div className="space-y-2">
                <p><strong>🚫 Access Denied</strong></p>
                <p className="text-sm">
                  Print and Export features are not available for Guest accounts. 
                  This includes PDF, CSV, Image exports and Email/LINE sending.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Guest Account Limitations</span>
            </div>
            <p className="text-xs text-blue-600">
              Guest users have read-only access. Contact administrator for full printing and export capabilities.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              ← Close
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/login'}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Login with Full Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
      <div className="bg-white rounded shadow-lg p-6 min-w-[400px] max-w-lg flex flex-col">
        {/* Step 1: Select Export Type (Radio Button Horizontal) */}
  <h2 className="text-lg font-semibold mb-4 text-center">Select Export Type</h2>
        <div className="flex justify-center gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportType"
              value="pdf"
              checked={selectedExportType === 'pdf'}
              onChange={() => setSelectedExportType('pdf')}
              disabled={!isLoaded || !hasData || isLoading}
            />
            <Printer className="w-4 h-4" /> PDF
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportType"
              value="csv"
              checked={selectedExportType === 'csv'}
              onChange={() => setSelectedExportType('csv')}
              disabled={!isLoaded || !hasData || isLoading}
            />
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportType"
              value="image"
              checked={selectedExportType === 'image'}
              onChange={() => setSelectedExportType('image')}
              disabled={!isLoaded || !hasData || isLoading}
            />
            <ImageIcon className="w-4 h-4" /> Image
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportType"
              value="text"
              checked={selectedExportType === 'text'}
              onChange={() => setSelectedExportType('text')}
              disabled={!isLoaded || !hasData || isLoading}
            />
            <FileText className="w-4 h-4" /> Text
          </label>
        </div>

        {/* Step 2: Select Action (Dropdown) */}
        {selectedExportType && (
          <>
            <h2 className="text-md font-semibold mb-2 text-center">Select Action</h2>
            <Select value={selectedAction || ''} onValueChange={(value) => setSelectedAction(value as any)}>
              <SelectTrigger className="h-10 text-sm rounded-none mb-4">
                <SelectValue placeholder="Select Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="download">
                  <Download className="w-4 h-4 mr-2 inline" /> Download
                </SelectItem>
                {/* Show email/line options only if onSendReport is available */}
                {onSendReport && (
                  <>
                    <SelectItem value="email">
                      <Mail className="w-4 h-4 mr-2 inline" /> Send to Email
                    </SelectItem>
                    {/* Show Send to Line only for exportType === 'text' */}
                    {selectedExportType === 'text' && (
                      <SelectItem value="line">
                        <Send className="w-4 h-4 mr-2 inline" /> Send to Line
                      </SelectItem>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Step 3: Action Details */}
        {selectedExportType && selectedAction === 'download' && (
          <div className="flex gap-2 mb-2">
            <Button
              className="h-10 text-sm rounded-none flex-1"
              onClick={handleExport}
              disabled={!isLoaded || !hasData || isLoading}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button
              variant="outline"
              className="h-10 text-sm rounded-none flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Email Section */}
        {selectedExportType && selectedAction === 'email' && (
          <div className="space-y-4">
            <div className="mb-2">
              <Select value={selectedEmailList !== null ? 'list' : selectedEmailGroup !== null ? 'group' : ''} onValueChange={(value) => {
                if (value === 'list') {
                  setSelectedEmailList(0);
                  setSelectedEmailGroup(null);
                } else if (value === 'group') {
                  setSelectedEmailGroup(0);
                  setSelectedEmailList(null);
                }
              }}>
                <SelectTrigger className="h-8 text-xs rounded-none w-full">
                  <SelectValue placeholder="Choose Email Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Email List</SelectItem>
                  <SelectItem value="group">Email Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Email List Dropdown */}
            {selectedEmailList !== null && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700">Select Email List</h3>
                <Select value={selectedEmailList?.toString() || ''} onValueChange={(value) => setSelectedEmailList(value ? parseInt(value) : null)}>
                  <SelectTrigger className="h-8 text-xs rounded-none">
                    <SelectValue placeholder="Choose Email List" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailList.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Email Group Dropdown */}
            {selectedEmailGroup !== null && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700">Select Email Group</h3>
                <Select value={selectedEmailGroup?.toString() || ''} onValueChange={(value) => setSelectedEmailGroup(value ? parseInt(value) : null)}>
                  <SelectTrigger className="h-8 text-xs rounded-none">
                    <SelectValue placeholder="Choose Email Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full h-10 text-sm rounded-none"
              onClick={handleSendEmail}
              disabled={!isLoaded || !hasData || isSending || (selectedEmailList === null && selectedEmailGroup === null)}
            >
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        )}

        {/* Line Section */}
        {selectedExportType && selectedAction === 'line' && (
          <div className="space-y-4">
            <div className="mb-2">
              <Select value={selectedLineList !== null ? 'list' : selectedLineGroup !== null ? 'group' : ''} onValueChange={(value) => {
                if (value === 'list') {
                  setSelectedLineList(-1);
                  setSelectedLineGroup(null);
                } else if (value === 'group') {
                  setSelectedLineGroup(-1);
                  setSelectedLineList(null);
                }
              }}>
                <SelectTrigger className="h-8 text-xs rounded-none w-full">
                  <SelectValue placeholder="Choose LINE Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">LINE List</SelectItem>
                  <SelectItem value="group">LINE Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* LINE List Dropdown */}
            {selectedLineList !== null && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700">Select LINE List</h3>
                <Select value={selectedLineList && selectedLineList > 0 ? selectedLineList.toString() : ''} onValueChange={(value) => setSelectedLineList(value ? parseInt(value) : null)}>
                  <SelectTrigger className="h-8 text-xs rounded-none">
                    <SelectValue placeholder="Choose LINE List" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveLineList.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-gray-500">No LINE users available</div>
                    ) : effectiveLineList.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName || user.lineId || user.email || `ID ${user.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* LINE Group Dropdown */}
            {selectedLineGroup !== null && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700">Select LINE Group</h3>
                <Select value={selectedLineGroup && selectedLineGroup > 0 ? selectedLineGroup.toString() : ''} onValueChange={(value) => setSelectedLineGroup(value ? parseInt(value) : null)}>
                  <SelectTrigger className="h-8 text-xs rounded-none">
                    <SelectValue placeholder="Choose LINE Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveLineGroups.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-gray-500">No LINE groups available</div>
                    ) : effectiveLineGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full h-10 text-sm rounded-none"
              onClick={handleSendLine}
              disabled={!isLoaded || !hasData || isSending || ((selectedLineList === null || selectedLineList <= 0) && (selectedLineGroup === null || selectedLineGroup <= 0))}
            >
              {isSending ? 'Sending...' : 'Send to Line'}
            </Button>
          </div>
        )}

        {/* Cancel button for other actions (not download) */}
        {!(selectedExportType && selectedAction === 'download') && (
          <Button variant="outline" className="w-full mt-4 rounded-none" onClick={handleClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};
