import {TasksCollectionPage,type TaskCollectionPageProps} from './TaskModulePages'
/** Legacy entry points kept for route compatibility — they delegate to the shared enterprise task pages. */
export const TasksPage = (props: TaskCollectionPageProps) => <TasksCollectionPage {...props} />
export const DepartmentTasksPage = (props: TaskCollectionPageProps) => <TasksCollectionPage title="وظایف واحد" {...props} />
