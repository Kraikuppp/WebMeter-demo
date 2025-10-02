// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
  lockoutTime?: number;
  remainingAttempts?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    surname: string;
    level: string;
    role: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  surname: string;
  address?: string;
  phone?: string;
  lineId?: string;
  level: 'Admin' | 'Manager' | 'Supervisor' | 'Engineer' | 'Operator';
  role_name?: string;
  status: 'active' | 'inactive';
  note?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  address?: string;
  phone?: string;
  lineId?: string;
  level: 'Admin' | 'Manager' | 'Supervisor' | 'Engineer' | 'Operator';
  status?: 'active' | 'inactive';
  note?: string;
  groupId?: number;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  address?: string;
  phone?: string;
  lineId?: string;
  level?: 'Admin' | 'Manager' | 'Supervisor' | 'Engineer' | 'Operator';
  status?: 'active' | 'inactive';
}

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface GoogleSignupRequest {
  email: string;
  name: string;
  surname?: string;
  googleId?: string;
  accessToken?: string;
}

export interface GoogleLoginRequest {
  googleId: string;
  email: string;
  name: string;
  surname?: string;
  picture?: string;
  credential: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  name?: string;
  surname?: string;
  address?: string;
  phone?: string;
  lineId?: string;
  level?: 'Admin' | 'Manager' | 'Supervisor' | 'Engineer' | 'Operator';
  status?: 'active' | 'inactive';
  note?: string;
  groupId?: number;
  lineGroupId?: number;
}

export interface UserFilters {
  search?: string;
  level?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// Table Data Types
export interface TableDataRow {
  time: string;
  [key: string]: any; // สำหรับค่าในคอลัมน์ต่างๆ
}

export interface TableDataResponse {
  success: boolean;
  data: TableDataRow[];
  count: number;
  columns: string[];
  dateRange: {
    from: string;
    to: string;
  };
}

export interface MeterInfo {
  meter_id: string;
  meter_name?: string;
}

export interface DateRangeResponse {
  success: boolean;
  dateRange: {
    min_date: string;
    max_date: string;
  };
}

// Charge Data Types
export interface ChargeDataRow {
  meterName: string;
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
  whCharge: number;
  ft: number;
  demandCharge: number;
  surcharge: number;
  total: number;
  vat: number;
  grandTotal: number;
}

export interface ChargeDataResponse {
  success: boolean;
  data: ChargeDataRow[];
  message?: string;
}

export interface DemandChargeLogResponse {
  success: boolean;
  data: DemandChargeLogRow[];
  message?: string;
}

export interface DemandChargeLogRow {
  meterName: string;
  meterClass: string;
  slaveId: number;
  logData: DemandLogEntry[];
  maxDemand: DemandValue;
  minDemand: DemandValue;
  onPeakDemand: DemandValue;
  offPeakDemand: DemandValue;
  avgDemand: DemandValue;
  demandCharge: DemandCharge;
}

export interface DemandLogEntry {
  timestamp: string;
  demandW: number;
  demandVar: number;
  demandVA: number;
  importKwh: number;
  exportKwh: number;
  importKvarh: number;
  exportKvarh: number;
  isOnPeak: boolean;
}

export interface DemandValue {
  watt: number;
  var: number;
  va: number;
  timestamp: string;
}

export interface DemandCharge {
  onPeak: {
    dmW: number;
    charge: number;
  };
  offPeak: {
    dmW: number;
    charge: number;
  };
  total: number;
}

export interface ChargeRealtimeResponse {
  success: boolean;
  data: ChargeRealtimeRow[];
  message?: string;
  interval: string;
  totalRecords: number;
}

export interface ChargeRealtimeRow {
  meterName: string;
  meterClass: string;
  slaveId: number;
  realtimeData: ChargeRealtimeData[];
  summary: {
    maxDemand: DemandValue;
    minDemand: DemandValue;
    onPeakDemand: DemandValue;
    offPeakDemand: DemandValue;
    avgDemand: {
      watt: number;
      var: number;
      va: number;
    };
    totalEnergy: {
      import: number;
      export: number;
      importVar: number;
      exportVar: number;
    };
  };
  charge: {
    onPeakWh: number;
    offPeakWh: number;
    onPeakWhCharge: number;
    offPeakWhCharge: number;
    totalWhCharge: number;
    onPeakDemandCharge: number;
    offPeakDemandCharge: number;
    totalDemandCharge: number;
    powerFactorCharge: number;
    ft: number;
    total: number;
    vat: number;
    grandTotal: number;
  };
}

export interface ChargeRealtimeData {
  timestamp: string;
  demandW: number;
  demandVar: number;
  demandVA: number;
  importKwh: number;
  exportKwh: number;
  importKvarh: number;
  exportKvarh: number;
  frequency: number;
  voltageLN: number;
  voltageLL: number;
  currentAvg: number;
  powerTotal: number;
  reactivePowerTotal: number;
  apparentPowerTotal: number;
  powerFactorTotal: number;
  thdv: number;
  thdi: number;
  isOnPeak: boolean;
}

// Event Types
export interface Event {
  no: number;
  time: string;
  username: string;
  ip: string;
  lognetIp: string;
  event: string;
  id: number;
  timestamp: string;
  created_at: string;
}

export interface EventResponse {
  success: boolean;
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}

export interface EventStats {
  totalEvents: number;
  uniqueUsers: number;
  uniqueIPs: number;
  uniqueEventTypes: number;
}

export interface CreateEventRequest {
  username: string;
  ip: string;
  lognetIp: string;
  event: string;
  description?: string;
}

export interface EventFilters {
  dateFrom: string;
  dateTo: string;
  timeFrom?: string;
  timeTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

// API Client Class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // For non-2xx responses, return the error data directly
        // This preserves error fields like lockoutTime, remainingAttempts etc.
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          ...data // Include all fields from error response
        };
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // User Management API Methods
  async getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    
    return this.request<User[]>(endpoint);
  }

  async getUserById(id: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<ApiResponse<{id: number; username: string}>> {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Parameter Value API Methods
  async getParameterValueBySlaveId(slaveId: number): Promise<ApiResponse<any[]>> {
    console.log(`🚀 === API CLIENT: GET PARAMETER VALUE BY SLAVE ID ===`);
    console.log(`🚀 Fetching parameter data for slave_id: ${slaveId}`);
    console.log(`🚀 Endpoint: /parameters/slave/${slaveId}`);
    
    try {
      const response = await this.request<any[]>(`/parameters/slave/${slaveId}`);
      console.log(`🚀 API Response:`, response);
      return response;
    } catch (error) {
      console.error(`❌ API Error:`, error);
      return {
        success: false,
        error: `Failed to fetch parameter data for slave_id: ${slaveId}`,
        data: null
      };
    }
  }

  async getActiveFTConfig(): Promise<ApiResponse<any>> {
    console.log(`🚀 === API CLIENT: GET ACTIVE FT CONFIG ===`);
    console.log(`🚀 Fetching active FT configuration for current date`);
    console.log(`🚀 Endpoint: /ft-config/active/current`);
    
    try {
      const response = await this.request<any>(`/ft-config/active/current`);
      console.log(`🚀 API Response:`, response);
      return response;
    } catch (error) {
      console.error(`❌ API Error:`, error);
      return {
        success: false,
        error: `Failed to fetch active FT configuration`,
        data: null
      };
    }
  }

  async updateUserStatus(id: number, status: 'active' | 'inactive'): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getUserStats(): Promise<ApiResponse<any[]>> {
    return this.request('/users/stats/summary');
  }

  // Authentication API Methods
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    this.clearToken();
    return response;
  }

  async verifyToken(): Promise<ApiResponse<any>> {
    return this.request('/auth/verify');
  }

  // Table Data Methods
  async getTableData(params: {
    dateFrom: string;
    dateTo: string;
    timeFrom?: string;
    timeTo?: string;
    columns?: string[];
    slaveIds?: number[]; // ใช้ slaveIds แทน meterId
    interval?: string;
  }): Promise<ApiResponse<TableDataResponse>> {
    const queryParams = new URLSearchParams({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      timeFrom: params.timeFrom || '00:00',
      timeTo: params.timeTo || '23:59',
    });

    if (params.columns && params.columns.length > 0) {
      params.columns.forEach(col => {
        queryParams.append('columns', col);
      });
    }

    if (params.slaveIds && params.slaveIds.length > 0) {
      params.slaveIds.forEach(slaveId => {
        queryParams.append('slaveIds', slaveId.toString());
      });
    }

    if (params.interval) {
      queryParams.append('interval', params.interval);
    }

    return this.request(`/table-data?${queryParams.toString()}`);
  }

  // Charge Data Methods (deprecated - use getChargeData below)

  // Demand Charge Log Data Methods
  async getDemandChargeLogData(params: {
    dateFrom: string;
    dateTo: string;
    timeFrom?: string;
    timeTo?: string;
    slaveIds?: number[];
  }): Promise<ApiResponse<DemandChargeLogResponse>> {
    const queryParams = new URLSearchParams({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      timeFrom: params.timeFrom || '00:00',
      timeTo: params.timeTo || '23:59',
    });

    if (params.slaveIds && params.slaveIds.length > 0) {
      params.slaveIds.forEach(slaveId => {
        queryParams.append('slaveIds', slaveId.toString());
      });
    }

    return this.request(`/table-data/demand-charge-log?${queryParams.toString()}`);
  }

  // Charge Realtime Data Methods (ทุก 1 นาที)
  async getChargeRealtimeData(params: {
    dateFrom: string;
    dateTo: string;
    timeFrom?: string;
    timeTo?: string;
    slaveIds?: number[];
  }): Promise<ApiResponse<ChargeRealtimeResponse>> {
    const queryParams = new URLSearchParams({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      timeFrom: params.timeFrom || '00:00',
      timeTo: params.timeTo || '23:59',
    });

    if (params.slaveIds && params.slaveIds.length > 0) {
      params.slaveIds.forEach(slaveId => {
        queryParams.append('slaveIds', slaveId.toString());
      });
    }

    return this.request(`/table-data/charge-realtime?${queryParams.toString()}`);
  }

  // Dashboard Data Methods
  async getDashboardData(fromTime?: string, toTime?: string, slaveId?: number): Promise<ApiResponse<{
    currentValues: {
      watt: number;
      var: number;
      va: number;
      powerFactor: number;
      voltLN: number;
      voltLL: number;
      currentAvg: number;
      frequency: number;
      voltAN: number;
      voltBN: number;
      voltCN: number;
      voltAB: number;
      voltBC: number;
      voltCA: number;
      currentA: number;
      currentB: number;
      currentC: number;
      currentN: number;
      wattA: number;
      wattB: number;
      wattC: number;
      varA: number;
      varB: number;
      varC: number;
      vaA: number;
      vaB: number;
      vaC: number;
      pfA: number;
      pfB: number;
      pfC: number;
      thdv: number;
      thdi: number;
    };
    energyData: {
      importKwh: number;
      exportKwh: number;
      importKvarh: number;
      exportKvarh: number;
    };
    demandData: Array<{
      hour: number;
      watt: number;
      var: number;
      va: number;
    }>;
    touData: Array<{
      hour: number;
      demandW: number;
      demandVar: number;
      demandVA: number;
      importKwh: number;
      exportKwh: number;
      importKvarh: number;
      exportKvarh: number;
    }>;
    chartData: {
      watt: number[];
      var: number[];
      va: number[];
      powerFactor: number[];
    };
    yesterdayData: {
      watt: number;
      var: number;
      va: number;
      powerFactor: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (fromTime) {
      queryParams.append('from', fromTime);
    }
    if (toTime) {
      queryParams.append('to', toTime);
    }
    if (slaveId) {
      queryParams.append('slaveId', slaveId.toString());
    }
    
    return this.request(`/dashboard?${queryParams.toString()}`);
  }

  async getCurrentMeterValues(meterId?: string): Promise<ApiResponse<{
    watt: number;
    var: number;
    va: number;
    powerFactor: number;
    voltLN: number;
    voltLL: number;
    currentAvg: number;
    frequency: number;
    timestamp: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (meterId) {
      queryParams.append('meterId', meterId);
    }
    
    return this.request(`/dashboard/current-values?${queryParams.toString()}`);
  }

  async getAvailableMeters(): Promise<ApiResponse<{ meters: MeterInfo[] }>> {
    return this.request('/table-data/available-meters');
  }

  async getTableDataDateRange(): Promise<ApiResponse<DateRangeResponse>> {
    return this.request('/table-data/date-range');
  }

  // Event API Methods
  async getEvents(filters: EventFilters): Promise<ApiResponse<EventResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.request<EventResponse>(`/events?${params.toString()}`);
  }

  async getEventDateRange(): Promise<ApiResponse<DateRangeResponse>> {
    return this.request<DateRangeResponse>('/events/date-range');
  }

  async getEventStats(filters: {
    dateFrom: string;
    dateTo: string;
    timeFrom?: string;
    timeTo?: string;
  }): Promise<ApiResponse<EventStats>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.request<EventStats>(`/events/stats?${params.toString()}`);
  }

  // Create new event
  async createEvent(eventData: {
    username: string;
    ip: string;
    lognetIp: string;
    event: string;
    description?: string;
  }): Promise<ApiResponse<Event>> {
    console.log('🚀 === API CLIENT: CREATE EVENT ===');
    console.log('📝 Creating new event:', eventData);
    console.log('🚀 Endpoint: /events');
    
    try {
      const response = await this.request<Event>('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      console.log('✅ Event created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ API Error:', error);
      return {
        success: false,
        error: `Failed to create event: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }
// Signup API Methods
  async signup(signupData: SignupRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/signup', {
      method: 'POST',
      body: JSON.stringify(signupData),
    });
  }

  async sendOtp(phoneData: SendOtpRequest): Promise<ApiResponse<{ otp?: string }>> {
    return this.request<{ otp?: string }>('/signup/send-otp', {
      method: 'POST',
      body: JSON.stringify(phoneData),
    });
  }

  async verifyOtp(otpData: VerifyOtpRequest): Promise<ApiResponse> {
    return this.request('/signup/verify-otp', {
      method: 'POST',
      body: JSON.stringify(otpData),
    });
  }

  async googleSignup(googleData: GoogleSignupRequest): Promise<ApiResponse<User & { existing?: boolean }>> {
    return this.request<User & { existing?: boolean }>('/signup/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }

  async googleLogin(googleData: GoogleLoginRequest): Promise<ApiResponse<LoginResponse>> {
    console.log('🚀 === API CLIENT: GOOGLE LOGIN ===');
    console.log('📝 Google login data:', {
      googleId: googleData.googleId,
      email: googleData.email,
      name: googleData.name,
      surname: googleData.surname,
      hasCredential: !!googleData.credential
    });
    console.log('🚀 Endpoint: /auth/google');
    
    try {
      const response = await this.request<LoginResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify(googleData),
      });
      
      console.log('✅ Google login response:', {
        success: response.success,
        hasToken: !!(response.data?.token),
        error: response.error
      });
      
      if (response.success && response.data?.token) {
        this.setToken(response.data.token);
        console.log('🔑 Token saved successfully');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Google login API error:', error);
      return {
        success: false,
        error: `Google login failed: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }

  // Group Management API
  async getGroups(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    return this.request<{ id: number; name: string }[]>('/groups');
  }

  async addGroup(groupData: { name: string }): Promise<ApiResponse<{ id: number; name: string }>> {
    return this.request<{ id: number; name: string }>('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async getLineGroups(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    return this.request<{ id: number; name: string }[]>('/groups/line');
  }

  async addLineGroup(groupData: { name: string }): Promise<ApiResponse<{ id: number; name: string }>> {
    return this.request<{ id: number; name: string }>('/groups/line', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async updateGroup(groupId: number, groupData: { name: string }): Promise<ApiResponse<{ id: number; name: string }>> {
    return this.request<{ id: number; name: string }>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
  }

  async deleteGroup(groupId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async updateLineGroup(groupId: number, groupData: { name: string }): Promise<ApiResponse<{ id: number; name: string }>> {
    return this.request<{ id: number; name: string }>(`/groups/line/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
  }

  async deleteLineGroup(groupId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/groups/line/${groupId}`, {
      method: 'DELETE',
    });
  }

  async getEmailGroups(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    return this.request<{ id: number; name: string }[]>('/groups');
  }

  async getUsersByGroup(groupId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/users/group/${groupId}`, {
      method: 'GET',
    });
  }

  async getUsersByLineGroup(groupId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/users/line-group/${groupId}`, {
      method: 'GET',
    });
  }

  // Charge Data API
  async getChargeData(params: {
    slaveIds: number[];
    dateFrom: Date;
    dateTo: Date;
    timeFrom?: string;
    timeTo?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams({
      slaveIds: JSON.stringify(params.slaveIds),
      dateFrom: params.dateFrom.toISOString(),
      dateTo: params.dateTo.toISOString(),
      timeFrom: params.timeFrom || '00:00',
      timeTo: params.timeTo || '23:59'
    });

    return this.request<any[]>(`/charge-data?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  async testChargeDataApi(): Promise<ApiResponse<any>> {
    return this.request<any>('/charge-data/test', {
      method: 'GET',
    });
  }

  // Holidays API
  async getHolidays(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/holiday', {
      method: 'GET',
    });
  }

  // Calculation Email API
  async sendCalculationEmail(emailData: {
    to_email: string;
    to_name: string;
    subject: string;
    meterName: string;
    dateRange: string;
    timeRange: string;
    exportType: string;
    reportTitle: string;
    attachmentData: string | null;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/calculation-email/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }

  // LINE Message API
  async sendLineMessage(lineData: {
    lineId: string;
    message: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/send-line-message', {
      method: 'POST',
      body: JSON.stringify(lineData),
    });
  }

  // Export Schedules API
  async getExportSchedules(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/export-schedules', {
      method: 'GET',
    });
  }

  async createExportSchedule(scheduleData: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    day_of_week?: string;
    day_of_month?: number;
    export_type: string;
    export_format: string;
    read_time: string;
    meters: string[];
    parameters: string[];
    file_path?: string;
    email_list?: number[];
    line_list?: number[];
    created_by: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/export-schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateExportSchedule(id: number, updateData: {
    enabled?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request<any>(`/export-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteExportSchedule(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/export-schedules/${id}`, {
      method: 'DELETE',
    });
  }

  async getDueExportSchedules(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/export-schedules/due', {
      method: 'GET',
    });
  }

  async markScheduleAsRun(id: number, runData: {
    success: boolean;
    error?: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>(`/export-schedules/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(runData),
    });
  }

}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export utility functions
export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export const isApiResponse = (obj: any): obj is ApiResponse => {
  return obj && typeof obj === 'object' && 'success' in obj;
};

export default apiClient;


