import type { Position } from '../../../domain/entities'
import { EmptyState } from '../../../components'
export const PositionList = ({ positions, canManage, onEdit }: { positions: readonly Position[]; canManage: boolean; onEdit?: (id: string) => void }) => positions.length ? <ul className="entity-list">{positions.map((item) => <li key={item.id}><span>{item.name}</span>{canManage && <button type="button" onClick={() => onEdit?.(item.id)}>ویرایش</button>}</li>)}</ul> : <EmptyState label="سمتی ثبت نشده است." />
