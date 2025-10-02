import apiClient from './api';

export interface FTConfig {
  id: number;
  year: number;
  name: string;
  value: number;
  unit: string;
  description: string;
  start_month: string;
  end_month: string;
  start_day: number;
  end_day: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
}

export interface CreateFTConfigRequest {
  year: number;
  name: string;
  value: number;
  unit: string;
  description?: string;
  start_month?: string;
  end_month?: string;
  start_day?: number;
  end_day?: number;
  created_by?: string;
}

export interface UpdateFTConfigRequest {
  year?: number;
  name?: string;
  value?: number;
  unit?: string;
  description?: string;
  start_month?: string;
  end_month?: string;
  start_day?: number;
  end_day?: number;
  is_active?: boolean;
  updated_by?: string;
}

export interface FTConfigFilters {
  year?: number;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface FTConfigResponse {
  success: boolean;
  data: FTConfig[];
  total: number;
}

export interface SingleFTConfigResponse {
  success: boolean;
  data: FTConfig;
}

export interface FTConfigRangeResponse {
  success: boolean;
  data: FTConfig[];
  total: number;
}

export interface BulkFTConfigRequest {
  configurations: CreateFTConfigRequest[];
  created_by?: string;
}

export interface BulkFTConfigResponse {
  success: boolean;
  message: string;
  data: FTConfig[];
  errors?: string[];
}

class FTConfigService {
  private baseUrl = '/ft-config';

  // Get all FT configurations with optional filters
  async getFTConfigs(filters?: FTConfigFilters): Promise<FTConfigResponse> {
    const params = new URLSearchParams();
    
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.name) params.append('name', filters.name);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.request<FTConfig[]>(endpoint);
  }

  // Get FT configuration by ID
  async getFTConfigById(id: number): Promise<SingleFTConfigResponse> {
    return apiClient.request<FTConfig>(`${this.baseUrl}/${id}`);
  }

  // Create new FT configuration
  async createFTConfig(config: CreateFTConfigRequest): Promise<SingleFTConfigResponse> {
    return apiClient.request<FTConfig>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // Update FT configuration
  async updateFTConfig(id: number, config: UpdateFTConfigRequest): Promise<SingleFTConfigResponse> {
    return apiClient.request<FTConfig>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  // Delete FT configuration (hard delete)
  async deleteFTConfig(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.request(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  // Get FT configurations by year
  async getFTConfigsByYear(year: number, filters?: { name?: string }): Promise<FTConfigResponse> {
    const params = new URLSearchParams();
    
    if (filters?.name) params.append('name', filters.name);

    const queryString = params.toString();
    const endpoint = `${this.baseUrl}/year/${year}${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.request<FTConfig[]>(endpoint);
  }

  // Get FT configurations by year range
  async getFTConfigsByYearRange(
    startYear: number, 
    endYear: number, 
    filters?: { name?: string }
  ): Promise<FTConfigRangeResponse> {
    const params = new URLSearchParams();
    
    if (filters?.name) params.append('name', filters.name);

    const queryString = params.toString();
    const endpoint = `${this.baseUrl}/year-range/${startYear}/${endYear}${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.request<FTConfig[]>(endpoint);
  }

  // Bulk create FT configurations for a year
  async bulkCreateFTConfigs(year: number, request: BulkFTConfigRequest): Promise<BulkFTConfigResponse> {
    return apiClient.request<FTConfig[]>(`${this.baseUrl}/bulk/${year}`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Get FT configurations for current year
  async getCurrentYearFTConfigs(): Promise<FTConfigResponse> {
    const currentYear = new Date().getFullYear();
    return this.getFTConfigsByYear(currentYear);
  }

  // Get FT configurations for next year
  async getNextYearFTConfigs(): Promise<FTConfigResponse> {
    const nextYear = new Date().getFullYear() + 1;
    return this.getFTConfigsByYear(nextYear);
  }

  // Get FT configurations for previous year
  async getPreviousYearFTConfigs(): Promise<FTConfigResponse> {
    const previousYear = new Date().getFullYear() - 1;
    return this.getFTConfigsByYear(previousYear);
  }

  // Get FT configurations for a specific year range
  async getFTConfigsForYearRange(startYear: number, endYear: number): Promise<FTConfigResponse> {
    const response = await this.getFTConfigsByYearRange(startYear, endYear);
    return response;
  }

  // Get active FT configurations
  async getActiveFTConfigs(filters?: FTConfigFilters): Promise<FTConfigResponse> {
    return this.getFTConfigs(filters);
  }

  // Search FT configurations by name
  async searchFTConfigsByName(name: string, year?: number): Promise<FTConfigResponse> {
    const filters: FTConfigFilters = { name };
    if (year) filters.year = year;
    return this.getFTConfigs(filters);
  }

  // Get FT configurations for a specific date range
  async getFTConfigsForDateRange(startDate: Date, endDate: Date): Promise<FTConfigResponse> {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    const response = await this.getFTConfigsByYearRange(startYear, endYear);
    
    // Filter configurations that fall within the date range
    const filteredConfigs = response.data.filter(config => {
      // This is a simplified filter - you might want to implement more complex logic
      // based on your specific requirements for date range matching
      return config.year >= startYear && config.year <= endYear;
    });

    return {
      success: true,
      data: filteredConfigs,
      total: filteredConfigs.length
    };
  }

  // Get default FT configurations for a year
  async getDefaultFTConfigs(year: number): Promise<FTConfigResponse> {
    const defaultConfigs: CreateFTConfigRequest[] = [
      {
        year,
        name: 'FT Rate 1',
        value: 0.0000,
        unit: 'Baht/Unit',
        description: 'อัตราค่าไฟฟ้าฐาน',
        start_month: 'Jan',
        end_month: 'Dec',
        start_day: 1,
        end_day: 31
      },
      {
        year,
        name: 'FT Rate 2',
        value: 0.0000,
        unit: 'Baht/Unit',
        description: 'อัตราค่าไฟฟ้าปรับ',
        start_month: 'Jan',
        end_month: 'Dec',
        start_day: 1,
        end_day: 31
      },
      {
        year,
        name: 'FT Rate 3',
        value: 0.0000,
        unit: 'Baht/Unit',
        description: 'อัตราค่าไฟฟ้าเพิ่มเติม',
        start_month: 'Jan',
        end_month: 'Dec',
        start_day: 1,
        end_day: 31
      }
    ];

    return this.bulkCreateFTConfigs(year, {
      configurations: defaultConfigs,
      created_by: 'system'
    });
  }

  // Copy FT configurations from one year to another
  async copyFTConfigsFromYear(sourceYear: number, targetYear: number): Promise<BulkFTConfigResponse> {
    try {
      // Get configurations from source year
      const sourceConfigs = await this.getFTConfigsByYear(sourceYear);
      
      if (sourceConfigs.data.length === 0) {
        return {
          success: false,
          message: `No FT configurations found for year ${sourceYear}`,
          data: [],
          errors: [`No configurations to copy from year ${sourceYear}`]
        };
      }

      // Prepare configurations for target year
      const targetConfigs: CreateFTConfigRequest[] = sourceConfigs.data.map(config => ({
        year: targetYear,
        name: config.name,
        value: config.value,
        unit: config.unit,
        description: config.description,
        start_month: config.start_month,
        end_month: config.end_month,
        start_day: config.start_day,
        end_day: config.end_day
      }));

      // Create configurations for target year
      return await this.bulkCreateFTConfigs(targetYear, {
        configurations: targetConfigs,
        created_by: 'system'
      });
    } catch (error) {
      console.error('Error copying FT configurations:', error);
      return {
        success: false,
        message: 'Failed to copy FT configurations',
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get FT configuration summary for a year
  async getFTConfigSummary(year: number): Promise<{
    total: number;
    totalValue: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
  }> {
    const response = await this.getFTConfigsByYear(year);
    
    if (response.data.length === 0) {
      return {
        total: 0,
        totalValue: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0
      };
    }

    const values = response.data.map(config => config.value);
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    const averageValue = totalValue / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return {
      total: response.data.length,
      totalValue,
      averageValue,
      minValue,
      maxValue
    };
  }
}

export const ftConfigService = new FTConfigService();
