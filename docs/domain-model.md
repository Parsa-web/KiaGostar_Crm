# Kia Gostar domain model

The domain layer is framework-independent. UI code depends on services; services depend on repository contracts; repository implementations alone know the data source.

## Relationships

- `User` and `Department` form a many-to-many relationship through `UserDepartment`; a user never owns a `departmentId` directly.
- Roles and capabilities are assigned through `UserRole` and `UserCapability`.
- A `Meeting` has participants and minutes and produces decisions.
- A decision creates a task. Tasks cannot be created independently of a decision.
- Task reports flow from an employee to their department manager.
- A department manager consolidates employee reports into a department report for the main manager.
- Attachments are independent records linked polymorphically by `entityType` and `entityId`.

## Ownership and business rules

- The main manager has organization-wide scope but does not create operational employee tasks directly.
- Department managers operate only inside assigned departments and create tasks from decisions.
- Employees own their task reports and requests and report to their department manager.
- Department managers report to the main manager.
- The secretary manages meeting documentation.
- Finalization and workflow behavior belong in future services, not entities or UI components.

## Implemented workflow boundaries

- Departments and positions are unique by normalized name. Disabled departments reject new memberships, and each multi-department user has at most one primary membership.
- Meeting creation requires `meeting.create`; the employee role is always rejected. Meeting participants receive internal lifecycle notifications.
- Persian speech recognition produces an editable transcript. A transcript is working material and is not itself minutes.
- Draft minutes can be edited and then finalized. Final records are locked unless the actor has the explicit finalized-document capability.
- Decisions can be registered only after their meeting minutes are final.
- Tasks require an existing decision and matching department. Only a department manager in that scope may create, assign, review, reassign, or cancel them.
- Employees can progress and report only tasks assigned to themselves. Final completion always requires department-manager review.
- Raw employee reports remain between employee and department manager. The main manager receives only submitted department summaries.
- Requests are submitted to the user's department manager and reach the main manager only through explicit escalation.
- Attachments are private and checked against the owning entity's self or department scope.
- Business transitions write audit records and internal panel notifications. No SMS provider or public file channel is implemented.
