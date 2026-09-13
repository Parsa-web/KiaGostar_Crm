# Kia Gostar CRM domain map

The frontend contracts are independent of React and transport details. Identifiers are opaque strings and timestamps use ISO 8601.

## Relationships

- Company → Department → manager and employees.
- Meeting → participants → Minutes → Decision → Task → Report.
- User owns reports, requests, uploads, knowledge drafts, and automation rules they create.
- FileAttachment joins a file to Meeting, Minutes, Decision, Task, Report, Request, or KnowledgeArticle.
- Notification belongs to one user. Search history is private to one user.

## Status flows

- Minutes: `DRAFT → UNDER_REVIEW → FINALIZED`; finalized minutes cannot return to draft.
- Knowledge: `DRAFT → UNDER_REVIEW → PUBLISHED → ARCHIVED`.
- Automation is advisory: it may notify, remind, alert, audit, or update non-sensitive metadata. It cannot approve, create tasks, change ownership, or change permissions.

## Ownership and access

- `MAIN_MANAGER` has organization scope.
- `DEPARTMENT_MANAGER` is limited to their departments and is the normal task creator.
- `SECRETARY` is limited to authorized meeting documentation.
- `EMPLOYEE` is limited to owned/assigned work and meetings in which they participate.
- File access requires both access to the related entity and file-level access.

Backend APIs must enforce these policies; UI guards only improve the interface.
