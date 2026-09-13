import type { AnalyticsRecord } from '../types'
export interface DashboardRepository { findAnalyticsRecords(): Promise<readonly AnalyticsRecord[]> }
export class InMemoryDashboardRepository implements DashboardRepository { private readonly records: readonly AnalyticsRecord[]; constructor(records: readonly AnalyticsRecord[] = []) { this.records = records } async findAnalyticsRecords() { return structuredClone(this.records) } }
