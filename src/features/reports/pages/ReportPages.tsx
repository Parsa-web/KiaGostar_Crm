import {ReportsCollectionPage,type ReportsCollectionPageProps} from './ReportModulePages'
/** Legacy entry points kept for route compatibility — they delegate to the shared enterprise report pages. */
export const ReportsPage = (props: ReportsCollectionPageProps) => <ReportsCollectionPage {...props} />
export const EmployeeReportsPage = (props: ReportsCollectionPageProps) => <ReportsCollectionPage title="گزارش‌های کارکنان" {...props} />
export const DepartmentReportsPage = (props: ReportsCollectionPageProps) => <ReportsCollectionPage title="گزارش‌های واحدها" {...props} />
