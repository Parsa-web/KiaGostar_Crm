import type { Task } from '../../../domain/entities'
import { EmptyState } from '../../../components'
export const TaskList = ({ tasks, onSelect }: { tasks: readonly Task[]; onSelect?: (id: string) => void }) => tasks.length ? <ul className="entity-list">{tasks.map((task) => <li key={task.id}><button type="button" onClick={() => onSelect?.(task.id)}><strong>{task.title}</strong><span>{task.status} · {task.priority} · {new Date(task.deadline).toLocaleDateString('fa-IR')}</span></button></li>)}</ul> : <EmptyState label="وظیفه‌ای وجود ندارد." />
