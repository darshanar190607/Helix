export interface Row {
  project_id: string;
  company_id: string;
  project_name: string;
  start_date: string;
  completion_date?: string;
  project_status: string;
  automation_type: string;
  robots_deployed: number;
  budget_usd: number;
  annual_savings_usd: number;
  roi_percent: number;
  department: string;
  implementation_partner: string;
  country: string;
  industry: string;
  employee_hours_saved: number;
  ai_enabled: string;
  cloud_deployment: string;
  internal_uid: string;
  [key: string]: any;
}

export interface SortKey {
  field: string;
  direction: 'asc' | 'desc';
}

export interface StateEngineSnapshot {
  version: number;
  totalProcessedCount: number;
  activeRobotsCount: number;
  cumulativeSavings: number;
  isPaused: boolean;
  bufferedBatchesCount: number;
  activeFilters: {
    automation_type: Set<string>;
    department: Set<string>;
    industry: Set<string>;
    ai_enabled?: string; // Optional F6 Panel C filters
    cloud_deployment?: string; // Optional F6 Panel C filters
  };
  sortPriority: SortKey[];
  searchQuery: string;
  uniqueValues: {
    automation_type: string[];
    department: string[];
    industry: string[];
  };
  visibleCount: number;
}
