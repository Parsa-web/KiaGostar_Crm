import { AuthService, InMemoryAuthRepository, PersistentSessionRepository, PermissionService } from '../features/auth'
import { demoAuthRecords } from '../features/auth/demoAuthSeed'
import { DepartmentService, InMemoryDepartmentRepository, InMemoryOrganizationUserRepository, InMemoryPositionRepository, InMemoryUserDepartmentRepository, PositionService, UserDepartmentService, UserRoleService } from '../features/organization'
import { DecisionService, InMemoryDecisionRepository, InMemoryMeetingRepository, InMemoryMinutesRepository, MeetingService, MinutesService, VoiceService } from '../features/meetings'
import { InMemoryTaskReportRepository, InMemoryTaskRepository, TaskService } from '../features/tasks'
import { InMemoryDepartmentReportRepository, InMemoryEmployeeReportRepository, ReportService } from '../features/reports'
import { InMemoryRequestRepository, RequestService } from '../features/requests'
import { FileService, InMemoryFileRepository, ActivityCoordinator } from '../services'
import { AuditService, InMemoryAuditRepository as FeatureAuditRepository } from '../features/audit'
import { NotificationService, InMemoryNotificationRepository as FeatureNotificationRepository } from '../features/notifications'
import { FileManagementService, InMemoryFileRepository as FeatureFileRepository } from '../features/files'
import { AnalyticsService, DashboardService, InMemoryDashboardRepository } from '../features/dashboard'
import { ApprovalService, EscalationService, InMemoryApprovalRepository, InMemoryEscalationRepository, InMemoryReminderRepository, InMemoryWorkflowRepository, ReminderService, WorkflowService } from '../features/workflow'
import { EvaluationService, FeedbackService, InMemoryEvaluationRepository, InMemoryFeedbackRepository, PerformanceAnalyticsService } from '../features/performance'

const authRepository = new InMemoryAuthRepository(demoAuthRecords)
const sessionRepository = new PersistentSessionRepository()
const departmentRepository = new InMemoryDepartmentRepository()
const positionRepository = new InMemoryPositionRepository()
const organizationUserRepository = new InMemoryOrganizationUserRepository()
const membershipRepository = new InMemoryUserDepartmentRepository()
const meetingRepository = new InMemoryMeetingRepository()
const minutesRepository = new InMemoryMinutesRepository()
const decisionRepository = new InMemoryDecisionRepository()
const taskRepository = new InMemoryTaskRepository()
const taskReportRepository = new InMemoryTaskReportRepository()
const employeeReportRepository = new InMemoryEmployeeReportRepository()
const departmentReportRepository = new InMemoryDepartmentReportRepository()
const requestRepository = new InMemoryRequestRepository()
const audit = new AuditService(new FeatureAuditRepository())
const notifications = new NotificationService(new FeatureNotificationRepository())
const activity = new ActivityCoordinator(audit, notifications)
const workflowRepository = new InMemoryWorkflowRepository()

export const services = Object.freeze({
  auth: new AuthService(authRepository, sessionRepository),
  permissions: new PermissionService(authRepository),
  departments: new DepartmentService(departmentRepository),
  positions: new PositionService(positionRepository),
  userDepartments: new UserDepartmentService(membershipRepository, departmentRepository, organizationUserRepository),
  userRoles: new UserRoleService(authRepository),
  meetings: new MeetingService(meetingRepository, activity),
  minutes: new MinutesService(minutesRepository, meetingRepository, activity),
  decisions: new DecisionService(decisionRepository, minutesRepository, meetingRepository, activity),
  voice: new VoiceService('fa-IR'),
  tasks: new TaskService(taskRepository, taskReportRepository, decisionRepository, membershipRepository, activity),
  reports: new ReportService(employeeReportRepository, departmentReportRepository, membershipRepository, activity),
  requests: new RequestService(requestRepository, membershipRepository, activity),
  files: new FileService(new InMemoryFileRepository()),
  fileManagement: new FileManagementService(new FeatureFileRepository()),
  notifications,
  audit,
  dashboard: new DashboardService(new AnalyticsService(new InMemoryDashboardRepository())),
  workflow: new WorkflowService(workflowRepository, audit, notifications),
  approvals: new ApprovalService(new InMemoryApprovalRepository(), audit, notifications),
  reminders: new ReminderService(new InMemoryReminderRepository(), notifications),
  escalations: new EscalationService(new InMemoryEscalationRepository(), audit, notifications),
  evaluations: new EvaluationService(new InMemoryEvaluationRepository(), audit, notifications),
  feedback: new FeedbackService(new InMemoryFeedbackRepository(), audit, notifications),
  performanceAnalytics: new PerformanceAnalyticsService(),
})
