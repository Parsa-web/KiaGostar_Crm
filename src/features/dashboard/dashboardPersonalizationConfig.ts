import type {RoleCode} from '../../domain/enums'

export interface DashboardPersonalizationDefinition{id:string;title:string}

export const dashboardPersonalizationByRole:Readonly<Record<RoleCode,readonly DashboardPersonalizationDefinition[]>>={
 MAIN_MANAGER:[
  {id:'performance',title:'عملکرد سازمان'},
  {id:'departments',title:'واحدهای سازمانی'},
  {id:'activity',title:'فعالیت‌های سازمانی'},
 ],
 DEPARTMENT_MANAGER:[
  {id:'team',title:'ظرفیت و بار کاری تیم'},
  {id:'events',title:'رویدادهای پیش‌رو'},
  {id:'activity',title:'فعالیت‌های واحد'},
  {id:'deadlines',title:'مهلت‌های نزدیک'},
 ],
 SECRETARY:[
  {id:'agenda',title:'برنامه امروز و روزهای پیش‌رو'},
  {id:'minutes',title:'صورتجلسه‌ها و مصوبات'},
  {id:'files',title:'فایل‌های اخیر'},
  {id:'activity',title:'فعالیت‌های اخیر من'},
 ],
 EMPLOYEE:[
  {id:'tasks',title:'وظایف من'},
  {id:'reports',title:'گزارش‌های من'},
  {id:'requests',title:'درخواست‌های من'},
  {id:'activity',title:'فعالیت‌های من'},
 ],
}

export const primaryDashboardRole=(roles:readonly RoleCode[]):RoleCode=>{
 if(roles.includes('MAIN_MANAGER'))return 'MAIN_MANAGER'
 if(roles.includes('DEPARTMENT_MANAGER'))return 'DEPARTMENT_MANAGER'
 if(roles.includes('SECRETARY'))return 'SECRETARY'
 return 'EMPLOYEE'
}
