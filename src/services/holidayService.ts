import apiClient from './api';

export interface Holiday {
  id: number;
  date: string;
  name_holiday: string;
  category: 'special' | 'annual';
  created_by?: string;
  created_at: string;
}

export interface CreateHolidayRequest {
  date: string;
  name_holiday: string;
  category: 'special' | 'annual';
  created_by?: string;
}

export interface UpdateHolidayRequest {
  date?: string;
  name_holiday?: string;
  category?: 'special' | 'annual';
}

export interface HolidayFilters {
  year?: number;
  category?: 'special' | 'annual';
  limit?: number;
  offset?: number;
}

export interface HolidayResponse {
  success: boolean;
  data: Holiday[];
  total: number;
}

export interface SingleHolidayResponse {
  success: boolean;
  data: Holiday;
}

export interface HolidayRangeResponse {
  success: boolean;
  data: Holiday[];
  total: number;
}

class HolidayService {
  private baseUrl = '/holiday';

  // Get all holidays with optional filters
  async getHolidays(filters?: HolidayFilters): Promise<HolidayResponse> {
    const params = new URLSearchParams();
    
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await apiClient.request(`${this.baseUrl}?${params.toString()}`);
    return response;
  }

  // Get holiday by ID
  async getHolidayById(id: number): Promise<SingleHolidayResponse> {
    const response = await apiClient.request(`${this.baseUrl}/${id}`);
    return response;
  }

  // Create new holiday
  async createHoliday(holiday: CreateHolidayRequest): Promise<SingleHolidayResponse> {
    const response = await apiClient.request(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(holiday),
    });
    return response;
  }

  // Update holiday
  async updateHoliday(id: number, holiday: UpdateHolidayRequest): Promise<SingleHolidayResponse> {
    const response = await apiClient.request(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(holiday),
    });
    return response;
  }

  // Delete holiday (soft delete)
  async deleteHoliday(id: number, deleted_by?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.request(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ deleted_by }),
    });
    return response;
  }

  // Get holidays by year range
  async getHolidaysByRange(
    startYear: number, 
    endYear: number, 
    filters?: { category?: string; type?: string }
  ): Promise<HolidayRangeResponse> {
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);

    const response = await apiClient.request(`${this.baseUrl}/range/${startYear}/${endYear}?${params.toString()}`);
    return response;
  }

  // Get holidays for a specific year
  async getHolidaysByYear(year: number, filters?: HolidayFilters): Promise<HolidayResponse> {
    return this.getHolidays({ ...filters, year });
  }

  // Get annual holidays for a year
  async getAnnualHolidays(year: number): Promise<HolidayResponse> {
    return this.getHolidays({ year, category: 'annual' });
  }

  // Get special holidays for a year
  async getSpecialHolidays(year: number): Promise<HolidayResponse> {
    return this.getHolidays({ year, category: 'special' });
  }

  // Check if a date is a holiday
  async isHoliday(date: string): Promise<boolean> {
    try {
      const response = await this.getHolidays({ 
        limit: 1, 
        offset: 0 
      });
      
      return response.data.some(holiday => holiday.date === date);
    } catch (error) {
      console.error('Error checking if date is holiday:', error);
      return false;
    }
  }

  // Get upcoming holidays (next 30 days)
  async getUpcomingHolidays(days: number = 30): Promise<HolidayResponse> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const startYear = today.getFullYear();
    const endYear = endDate.getFullYear();

    const response = await this.getHolidaysByRange(startYear, endYear);
    
    // Filter holidays within the date range
    const filteredHolidays = response.data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= today && holidayDate <= endDate;
    });

    return {
      success: true,
      data: filteredHolidays,
      total: filteredHolidays.length
    };
  }

  // Get holidays for current month
  async getCurrentMonthHolidays(): Promise<HolidayResponse> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const response = await this.getHolidays({ year });
    
    // Filter holidays for current month
    const filteredHolidays = response.data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() + 1 === month;
    });

    return {
      success: true,
      data: filteredHolidays,
      total: filteredHolidays.length
    };
  }

  // Get holidays for next month
  async getNextMonthHolidays(): Promise<HolidayResponse> {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;

    const response = await this.getHolidays({ year });
    
    // Filter holidays for next month
    const filteredHolidays = response.data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() + 1 === month;
    });

    return {
      success: true,
      data: filteredHolidays,
      total: filteredHolidays.length
    };
  }
}

export const holidayService = new HolidayService();
