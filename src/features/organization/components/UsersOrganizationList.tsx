import type { User } from '../../../domain/entities'
import { EmptyState } from '../../../components'
export const UsersOrganizationList = ({ users }: { users: readonly User[] }) => users.length ? <ul className="entity-list">{users.map((user) => <li key={user.id}>{user.firstName} {user.lastName}</li>)}</ul> : <EmptyState label="کاربری در این محدوده وجود ندارد." />
