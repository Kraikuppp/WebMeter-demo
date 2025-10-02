import * as XLSX from 'xlsx';

// สร้าง Excel template สำหรับ System Tree
export function createSystemTreeTemplate(): void {
  const systemData = [
    // Header row
    [
      'Location', 'LogNet Name', 'LogNet Brand', 'LogNet Model', 'LogNet Serial', 'LogNet IP',
      'Meter Name', 'Meter Brand', 'Meter Model', 'Meter SN', 'Slave ID', 'IP Address', 
      'Port', 'CT Primary', 'CT Secondary', 'PT Primary', 'PT Secondary', 'Baud Rate'
    ],
    // Example data rows
    [
      'Main Building', 'LogNet-01', 'Schneider', 'ION7650', 'SN001', '192.168.1.100',
      'Main Meter', 'Schneider', 'ION7650', 'M001', 1, '192.168.1.101',
      502, 1000, 5, 22000, 110, 9600
    ],
    [
      'Main Building', 'LogNet-01', 'Schneider', 'ION7650', 'SN001', '192.168.1.100',
      'Sub Meter 1', 'Schneider', 'ION7330', 'M002', 2, '192.168.1.102',
      502, 500, 5, 22000, 110, 9600
    ],
    [
      'Secondary Building', 'LogNet-02', 'ABB', 'M2M', 'SN002', '192.168.1.200',
      'Building 2 Main', 'ABB', 'M4M', 'M003', 3, '192.168.1.201',
      502, 2000, 5, 22000, 110, 9600
    ]
  ];

  // สร้าง workbook และ worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(systemData);

  // ตั้งค่าความกว้างของคอลัมน์
  const colWidths = [
    { wch: 15 }, // Location
    { wch: 12 }, // LogNet Name
    { wch: 12 }, // LogNet Brand
    { wch: 12 }, // LogNet Model
    { wch: 12 }, // LogNet Serial
    { wch: 15 }, // LogNet IP
    { wch: 15 }, // Meter Name
    { wch: 12 }, // Meter Brand
    { wch: 12 }, // Meter Model
    { wch: 10 }, // Meter SN
    { wch: 8 },  // Slave ID
    { wch: 15 }, // IP Address
    { wch: 6 },  // Port
    { wch: 10 }, // CT Primary
    { wch: 12 }, // CT Secondary
    { wch: 10 }, // PT Primary
    { wch: 12 }, // PT Secondary
    { wch: 10 }  // Baud Rate
  ];
  ws['!cols'] = colWidths;

  // เพิ่ม worksheet ลงใน workbook
  XLSX.utils.book_append_sheet(wb, ws, 'System Tree');

  // Download file
  XLSX.writeFile(wb, 'MeterTree_SystemTree_Template.xlsx');
}

// สร้าง Excel template สำหรับ Building Tree
export function createBuildingTreeTemplate(): void {
  const buildingData = [
    // Header row
    [
      'Location', 'Building', 'Floor', 'Meter Name', 'Meter Brand', 'Meter Model', 
      'Meter SN', 'Slave ID', 'IP Address', 'Port', 'CT Primary', 'CT Secondary', 
      'PT Primary', 'PT Secondary', 'Baud Rate'
    ],
    // Example data rows
    [
      'Main Campus', 'Building A', 'Floor 1', 'A1-Main Meter', 'Schneider', 'ION7650', 
      'M001', 1, '192.168.1.101', 502, 1000, 5, 22000, 110, 9600
    ],
    [
      'Main Campus', 'Building A', 'Floor 1', 'A1-Sub Meter 1', 'Schneider', 'ION7330', 
      'M002', 2, '192.168.1.102', 502, 500, 5, 22000, 110, 9600
    ],
    [
      'Main Campus', 'Building A', 'Floor 2', 'A2-Main Meter', 'ABB', 'M4M', 
      'M003', 3, '192.168.1.103', 502, 800, 5, 22000, 110, 9600
    ],
    [
      'Main Campus', 'Building B', 'Floor 1', 'B1-Main Meter', 'Schneider', 'ION7650', 
      'M004', 4, '192.168.1.104', 502, 1200, 5, 22000, 110, 9600
    ],
    [
      'Secondary Campus', 'Building C', 'Ground Floor', 'C-Ground Meter', 'ABB', 'M2M', 
      'M005', 5, '192.168.2.101', 502, 600, 5, 22000, 110, 9600
    ]
  ];

  // สร้าง workbook และ worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(buildingData);

  // ตั้งค่าความกว้างของคอลัมน์
  const colWidths = [
    { wch: 15 }, // Location
    { wch: 12 }, // Building
    { wch: 12 }, // Floor
    { wch: 15 }, // Meter Name
    { wch: 12 }, // Meter Brand
    { wch: 12 }, // Meter Model
    { wch: 10 }, // Meter SN
    { wch: 8 },  // Slave ID
    { wch: 15 }, // IP Address
    { wch: 6 },  // Port
    { wch: 10 }, // CT Primary
    { wch: 12 }, // CT Secondary
    { wch: 10 }, // PT Primary
    { wch: 12 }, // PT Secondary
    { wch: 10 }  // Baud Rate
  ];
  ws['!cols'] = colWidths;

  // เพิ่ม worksheet ลงใน workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Building Tree');

  // Download file
  XLSX.writeFile(wb, 'MeterTree_BuildingTree_Template.xlsx');
}

// สร้าง Excel template แบบรวม (ทั้ง System และ Building Tree)
export function createCombinedTemplate(): void {
  const wb = XLSX.utils.book_new();

  // System Tree Sheet
  const systemData = [
    [
      'Location', 'LogNet Name', 'LogNet Brand', 'LogNet Model', 'LogNet Serial', 'LogNet IP',
      'Meter Name', 'Meter Brand', 'Meter Model', 'Meter SN', 'Slave ID', 'IP Address', 
      'Port', 'CT Primary', 'CT Secondary', 'PT Primary', 'PT Secondary', 'Baud Rate'
    ],
    [
      'Main Building', 'LogNet-01', 'Schneider', 'ION7650', 'SN001', '192.168.1.100',
      'Main Meter', 'Schneider', 'ION7650', 'M001', 1, '192.168.1.101',
      502, 1000, 5, 22000, 110, 9600
    ],
    [
      'Main Building', 'LogNet-01', 'Schneider', 'ION7650', 'SN001', '192.168.1.100',
      'Sub Meter 1', 'Schneider', 'ION7330', 'M002', 2, '192.168.1.102',
      502, 500, 5, 22000, 110, 9600
    ]
  ];

  // Building Tree Sheet
  const buildingData = [
    [
      'Location', 'Building', 'Floor', 'Meter Name', 'Meter Brand', 'Meter Model', 
      'Meter SN', 'Slave ID', 'IP Address', 'Port', 'CT Primary', 'CT Secondary', 
      'PT Primary', 'PT Secondary', 'Baud Rate'
    ],
    [
      'Main Campus', 'Building A', 'Floor 1', 'A1-Main Meter', 'Schneider', 'ION7650', 
      'M001', 1, '192.168.1.101', 502, 1000, 5, 22000, 110, 9600
    ],
    [
      'Main Campus', 'Building A', 'Floor 2', 'A2-Main Meter', 'ABB', 'M4M', 
      'M003', 3, '192.168.1.103', 502, 800, 5, 22000, 110, 9600
    ]
  ];

  // สร้าง worksheets
  const systemWs = XLSX.utils.aoa_to_sheet(systemData);
  const buildingWs = XLSX.utils.aoa_to_sheet(buildingData);

  // ตั้งค่าความกว้างคอลัมน์สำหรับ System Tree
  const systemColWidths = [
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 15 },
    { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }
  ];
  systemWs['!cols'] = systemColWidths;

  // ตั้งค่าความกว้างคอลัมน์สำหรับ Building Tree
  const buildingColWidths = [
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 6 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }
  ];
  buildingWs['!cols'] = buildingColWidths;

  // เพิ่ม worksheets ลงใน workbook
  XLSX.utils.book_append_sheet(wb, systemWs, 'System Tree');
  XLSX.utils.book_append_sheet(wb, buildingWs, 'Building Tree');

  // เพิ่ม Instructions sheet
  const instructions = [
    ['MeterTree Excel Import Instructions'],
    [''],
    ['This Excel file contains templates for importing meter tree structures.'],
    [''],
    ['Sheet: System Tree'],
    ['- Structure: Location → LogNet → Meter'],
    ['- Use this for system-based organization'],
    ['- LogNet fields are required for system tree'],
    [''],
    ['Sheet: Building Tree'],
    ['- Structure: Location → Building → Floor → Meter'],
    ['- Use this for building-based organization'],
    ['- Building and Floor fields are required for building tree'],
    [''],
    ['Required Fields (both types):'],
    ['- Meter Name: Name of the meter'],
    ['- Meter Brand: Manufacturer (e.g., Schneider, ABB)'],
    ['- Meter Model: Model number'],
    ['- Slave ID: Unique numeric identifier'],
    ['- CT Primary: Current transformer primary rating'],
    ['- CT Secondary: Current transformer secondary rating'],
    ['- PT Primary: Potential transformer primary rating'],
    ['- PT Secondary: Potential transformer secondary rating'],
    [''],
    ['Optional Fields:'],
    ['- Meter SN: Serial number'],
    ['- IP Address: Network IP address'],
    ['- Port: Communication port (default: 502)'],
    ['- Baud Rate: Communication speed (default: 9600)'],
    [''],
    ['Notes:'],
    ['- Fill in all required fields'],
    ['- Use consistent naming for locations, buildings, floors'],
    ['- Slave IDs must be unique within the system'],
    ['- IP addresses should be valid if specified']
  ];

  const instructionsWs = XLSX.utils.aoa_to_sheet(instructions);
  instructionsWs['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

  // Download file
  XLSX.writeFile(wb, 'MeterTree_Import_Template.xlsx');
}

// ฟังก์ชันสำหรับ download template ตามประเภท
export function downloadTemplate(type: 'system' | 'building' | 'combined' = 'combined'): void {
  console.log(`📥 Downloading ${type} template...`);
  
  try {
    switch (type) {
      case 'system':
        createSystemTreeTemplate();
        break;
      case 'building':
        createBuildingTreeTemplate();
        break;
      case 'combined':
      default:
        createCombinedTemplate();
        break;
    }
    
    console.log('✅ Template downloaded successfully');
  } catch (error) {
    console.error('❌ Error downloading template:', error);
    throw error;
  }
}
