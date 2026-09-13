import type { Department } from '../../../domain/entities'
import { EmptyState } from '../../../components'
export const DepartmentList = ({ departments, onSelect }: { departments: readonly Department[]; onSelect?: (id: string) => void }) => departments.length ? <ul className="entity-list">{departments.map((item) => <li key={item.id}><button type="button" onClick={() => onSelect?.(item.id)}><strong>{item.name}</strong><span>{item.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}</span></button></li>)}</ul> : <EmptyState label="واحدی ثبت نشده است." />
