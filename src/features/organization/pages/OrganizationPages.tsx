import type { Department, Position, User } from '../../../domain/entities'
import { DepartmentList, PositionList, UsersOrganizationList } from '../components'
export const OrganizationPage = ({ children }: { children?: React.ReactNode }) => <section><h1>ساختار سازمانی</h1>{children}</section>
export const DepartmentsPage = ({ departments }: { departments: readonly Department[] }) => <section><h2>واحدها</h2><DepartmentList departments={departments} /></section>
export const DepartmentDetailsPage = ({ department, members }: { department: Department; members: readonly User[] }) => <section><h2>{department.name}</h2><p>{department.description}</p><UsersOrganizationList users={members} /></section>
export const PositionsPage = ({ positions, canManage }: { positions: readonly Position[]; canManage: boolean }) => <section><h2>سمت‌ها</h2><PositionList positions={positions} canManage={canManage} /></section>
export const UsersOrganizationPage = ({ users }: { users: readonly User[] }) => <section><h2>چیدمان کاربران</h2><UsersOrganizationList users={users} /></section>
