import type { Row, SortKey, StateEngineSnapshot } from './types';
import { multiSort } from './multiSort';
import { fuzzyMatch, chunkedFuzzySearch } from './fuzzySearch';

export class StateEngine {
  private static instance: StateEngine | null = null;

  // Core memory pool and stable rows list
  public memoryPool = new Map<string, Row>();
  public rowsList: Row[] = [];
  private uidToIndexMap = new Map<string, number>();

  // Derived state indices
  public sortedIndexes: number[] = [];
  public filteredIndexes: number[] = [];
  private searchMatchingIndices: number[] = []; // Cache search matches

  // Metrics (Feature 1)
  public totalProcessedCount = 0;
  public activeRobotsCount = 0;
  public cumulativeSavings = 0;

  // Pipeline Buffer Control (Feature 5)
  public isPaused = false;
  public pauseQueue: Row[][] = [];

  // Active Sorting (Feature 4 & 9)
  public sortPriority: SortKey[] = [];

  // Active Filtering (Feature 7 & 6 Panel C)
  public activeFilters = {
    automation_type: new Set<string>(),
    department: new Set<string>(),
    industry: new Set<string>(),
    ai_enabled: 'All', // 'All' | 'Yes' | 'No'
    cloud_deployment: 'All', // 'All' | 'Yes' | 'No'
  };

  // Search query (Feature 10)
  public searchQuery = '';

  // Cached unique values for dropdowns to prevent unnecessary renders (Feature 7)
  public uniqueValues = {
    automation_type: [] as string[],
    department: [] as string[],
    industry: [] as string[],
  };

  // Subscribers
  private subscribers = new Set<(snapshot: StateEngineSnapshot) => void>();
  private version = 0;

  private isRunningPipeline = false;

  private constructor() {}

  public static getInstance(): StateEngine {
    if (!StateEngine.instance) {
      StateEngine.instance = new StateEngine();
    }
    return StateEngine.instance;
  }

  public subscribe(callback: (snapshot: StateEngineSnapshot) => void): () => void {
    this.subscribers.add(callback);
    // Emit current state immediately
    callback(this.getSnapshot());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.version++;
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  public getSnapshot(): StateEngineSnapshot {
    return {
      version: this.version,
      totalProcessedCount: this.totalProcessedCount,
      activeRobotsCount: this.activeRobotsCount,
      cumulativeSavings: this.cumulativeSavings,
      isPaused: this.isPaused,
      bufferedBatchesCount: this.pauseQueue.length,
      activeFilters: {
        automation_type: new Set(this.activeFilters.automation_type),
        department: new Set(this.activeFilters.department),
        industry: new Set(this.activeFilters.industry),
        ai_enabled: this.activeFilters.ai_enabled,
        cloud_deployment: this.activeFilters.cloud_deployment,
      },
      sortPriority: [...this.sortPriority],
      searchQuery: this.searchQuery,
      uniqueValues: {
        automation_type: [...this.uniqueValues.automation_type],
        department: [...this.uniqueValues.department],
        industry: [...this.uniqueValues.industry],
      },
      visibleCount: this.sortedIndexes.length,
    };
  }

  /**
   * Main entry point for incoming stream batches (Feature 5, 8)
   */
  public process(incomingBatch: Row[]) {
    if (this.isPaused) {
      this.pauseQueue.push(incomingBatch);
      this.totalProcessedCount += incomingBatch.length;
      this.notify(); // Notify so paused batch counts update
      return;
    }

    this.totalProcessedCount += incomingBatch.length;
    this.mergeBatch(incomingBatch);
    this.runPipeline();
  }

  /**
   * Merge batch into pool in-place (Performance Guardrail 5)
   */
  private mergeBatch(batch: Row[]) {
    let uniqueValuesChanged = false;

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const uid = row.internal_uid;
      const existingRow = this.memoryPool.get(uid);

      if (existingRow) {
        // Subtract old values from running totals
        this.activeRobotsCount -= existingRow.robots_deployed || 0;
        this.cumulativeSavings -= existingRow.annual_savings_usd || 0;

        // In-place update (performance optimization)
        Object.assign(existingRow, row);

        // Add new values to running totals
        this.activeRobotsCount += existingRow.robots_deployed || 0;
        this.cumulativeSavings += existingRow.annual_savings_usd || 0;

        const idx = this.uidToIndexMap.get(uid);
        if (idx !== undefined) {
          this.rowsList[idx] = existingRow;
        }
      } else {
        // New row addition
        this.memoryPool.set(uid, row);
        this.rowsList.push(row);
        this.uidToIndexMap.set(uid, this.rowsList.length - 1);

        this.activeRobotsCount += row.robots_deployed || 0;
        this.cumulativeSavings += row.annual_savings_usd || 0;

        // Track if unique values might have changed
        uniqueValuesChanged = true;
      }
    }

    if (uniqueValuesChanged) {
      this.updateUniqueValues();
    }
  }

  /**
   * Scan memory pool and update unique categorical values if changed
   */
  private updateUniqueValues() {
    const automations = new Set<string>();
    const departments = new Set<string>();
    const industries = new Set<string>();

    for (let i = 0; i < this.rowsList.length; i++) {
      const r = this.rowsList[i];
      if (r.automation_type) automations.add(r.automation_type);
      if (r.department) departments.add(r.department);
      if (r.industry) industries.add(r.industry);
    }

    const nextAutomations = Array.from(automations).sort();
    const nextDepartments = Array.from(departments).sort();
    const nextIndustries = Array.from(industries).sort();

    // Only update if lists differ to avoid re-renders (Feature 7)
    if (
      JSON.stringify(this.uniqueValues.automation_type) !== JSON.stringify(nextAutomations) ||
      JSON.stringify(this.uniqueValues.department) !== JSON.stringify(nextDepartments) ||
      JSON.stringify(this.uniqueValues.industry) !== JSON.stringify(nextIndustries)
    ) {
      this.uniqueValues = {
        automation_type: nextAutomations,
        department: nextDepartments,
        industry: nextIndustries,
      };
    }
  }

  /**
   * Run the full search -> filter -> sort pipeline
   */
  public runPipeline() {
    if (this.isRunningPipeline) return;
    this.isRunningPipeline = true;

    // 1. Search (F10)
    // If pool is large, run search chunked, otherwise run synchronously
    if (this.searchQuery.trim().length > 0 && this.rowsList.length > 10000) {
      chunkedFuzzySearch(this.rowsList, this.searchQuery, (matchingIndices) => {
        this.searchMatchingIndices = matchingIndices;
        this.applyFiltersAndSort();
        this.isRunningPipeline = false;
        this.notify();
      });
    } else {
      // Synchronous search
      if (this.searchQuery.trim().length > 0) {
        const query = this.searchQuery;
        const matching: number[] = [];
        for (let i = 0; i < this.rowsList.length; i++) {
          if (fuzzyMatch(query, this.rowsList[i])) {
            matching.push(i);
          }
        }
        this.searchMatchingIndices = matching;
      } else {
        // All rows match
        this.searchMatchingIndices = this.rowsList.map((_, idx) => idx);
      }
      this.applyFiltersAndSort();
      this.isRunningPipeline = false;
      this.notify();
    }
  }

  /**
   * Apply filters (F7, F6) and sorting (F4, F9) to search matches
   */
  private applyFiltersAndSort() {
    const { automation_type, department, industry, ai_enabled, cloud_deployment } = this.activeFilters;
    const hasAutoFilter = automation_type.size > 0;
    const hasDeptFilter = department.size > 0;
    const hasIndFilter = industry.size > 0;
    const hasAiFilter = ai_enabled !== 'All';
    const hasCloudFilter = cloud_deployment !== 'All';

    // 2. Filters
    const filtered: number[] = [];
    for (let i = 0; i < this.searchMatchingIndices.length; i++) {
      const idx = this.searchMatchingIndices[i];
      const r = this.rowsList[idx];

      // Multi-select matches (OR logic within field, AND logic across fields)
      if (hasAutoFilter && !automation_type.has(r.automation_type)) continue;
      if (hasDeptFilter && !department.has(r.department)) continue;
      if (hasIndFilter && !industry.has(r.industry)) continue;

      // Panel C filters
      if (hasAiFilter && r.ai_enabled !== ai_enabled) continue;
      if (hasCloudFilter && r.cloud_deployment !== cloud_deployment) continue;

      filtered.push(idx);
    }
    this.filteredIndexes = filtered;

    // 3. Sorting
    const sorted = [...filtered];
    if (this.sortPriority.length > 0) {
      sorted.sort((idxA, idxB) => {
        return multiSort(this.rowsList[idxA], this.rowsList[idxB], this.sortPriority);
      });
    }
    this.sortedIndexes = sorted;
  }

  /**
   * Retrieve a row by its sorted position index
   */
  public getRowAtIndex(sortedIdx: number): Row | undefined {
    const originalIdx = this.sortedIndexes[sortedIdx];
    if (originalIdx === undefined) return undefined;
    return this.rowsList[originalIdx];
  }

  /**
   * Pipeline controls (Play/Pause) (Feature 5)
   */
  public togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.flushQueue();
    } else {
      this.notify();
    }
  }

  private async flushQueue() {
    if (this.pauseQueue.length === 0) {
      this.notify();
      return;
    }

    const batchesToProcess = [...this.pauseQueue];
    this.pauseQueue = [];

    // Process each batch in order sequentially using for...of (order matters)
    for (const batch of batchesToProcess) {
      this.mergeBatch(batch);
    }

    this.runPipeline();
  }

  /**
   * Filter modification functions (Feature 7)
   */
  public setFilter(field: 'automation_type' | 'department' | 'industry', values: Set<string>) {
    this.activeFilters[field] = values;
    this.runPipeline();
  }

  public setSwitchFilter(field: 'ai_enabled' | 'cloud_deployment', value: 'All' | 'Yes' | 'No') {
    this.activeFilters[field] = value;
    this.runPipeline();
  }

  /**
   * Sorting modification functions (Feature 4 & 9)
   */
  public toggleSort(field: string, isShiftKey: boolean) {
    const existingIndex = this.sortPriority.findIndex((s) => s.field === field);

    if (isShiftKey) {
      // Multi-column sorting
      if (existingIndex > -1) {
        const current = this.sortPriority[existingIndex];
        if (current.direction === 'asc') {
          current.direction = 'desc';
        } else {
          this.sortPriority.splice(existingIndex, 1); // remove sort
        }
      } else {
        this.sortPriority.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sorting (clears others)
      if (existingIndex > -1 && this.sortPriority.length === 1) {
        const current = this.sortPriority[0];
        if (current.direction === 'asc') {
          current.direction = 'desc';
        } else {
          this.sortPriority = []; // clear sort
        }
      } else {
        this.sortPriority = [{ field, direction: 'asc' }];
      }
    }

    this.runPipeline();
  }

  public clearSort() {
    this.sortPriority = [];
    this.runPipeline();
  }

  /**
   * Fuzzy Search query update (Feature 10)
   */
  public setSearchQuery(query: string) {
    this.searchQuery = query;
    this.runPipeline();
  }
}
