CREATE TABLE `attendance_anomalies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int,
	`departmentId` int,
	`ruleCode` varchar(64) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`confidencePercent` int NOT NULL,
	`evidenceJson` text NOT NULL,
	`explanation` text NOT NULL,
	`status` enum('open','acknowledged','resolved') NOT NULL DEFAULT 'open',
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	CONSTRAINT `attendance_anomalies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`workDate` varchar(10) NOT NULL,
	`checkInAt` timestamp,
	`checkOutAt` timestamp,
	`status` enum('present','late','absent','half_day') NOT NULL DEFAULT 'present',
	`workMinutes` int NOT NULL DEFAULT 0,
	`lateMinutes` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_employee_date_unique` UNIQUE(`employeeId`,`workDate`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(100) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'success',
	`metadataJson` text,
	`ipHash` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copilot_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copilot_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copilot_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','tool') NOT NULL,
	`content` text NOT NULL,
	`toolName` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copilot_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(24) NOT NULL,
	`description` text,
	`headEmployeeId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`employeeCode` varchar(32) NOT NULL,
	`firstName` varchar(80) NOT NULL,
	`lastName` varchar(80) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`departmentId` int,
	`jobTitle` varchar(120) NOT NULL,
	`joinedOn` varchar(10) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`avatarUrl` text,
	`workdayStartMinute` int NOT NULL DEFAULT 540,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `employees_code_unique` UNIQUE(`employeeCode`),
	CONSTRAINT `employees_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','unpaid') NOT NULL,
	`allocatedDays` int NOT NULL DEFAULT 0,
	`usedDays` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_balance_employee_type_unique` UNIQUE(`employeeId`,`leaveType`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','unpaid') NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`reason` text NOT NULL,
	`supportingDocumentKey` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`decisionReason` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`channel` enum('in_app','email') NOT NULL DEFAULT 'in_app',
	`type` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`href` varchar(240),
	`readAt` timestamp,
	`deliveryStatus` enum('queued','sent','failed','not_configured') NOT NULL DEFAULT 'queued',
	`deliveryError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`generatedByUserId` int NOT NULL,
	`reportType` varchar(64) NOT NULL,
	`filtersJson` text NOT NULL,
	`summaryJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','hr_manager','employee') NOT NULL DEFAULT 'employee';--> statement-breakpoint
CREATE INDEX `anomalies_status_idx` ON `attendance_anomalies` (`status`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `anomalies_employee_idx` ON `attendance_anomalies` (`employeeId`);--> statement-breakpoint
CREATE INDEX `attendance_workdate_idx` ON `attendance_records` (`workDate`);--> statement-breakpoint
CREATE INDEX `attendance_employee_idx` ON `attendance_records` (`employeeId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `copilot_conversation_user_idx` ON `copilot_conversations` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `copilot_message_conversation_idx` ON `copilot_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `employees_department_idx` ON `employees` (`departmentId`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `leave_employee_idx` ON `leave_requests` (`employeeId`);--> statement-breakpoint
CREATE INDEX `leave_status_idx` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE INDEX `leave_date_idx` ON `leave_requests` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_idx` ON `notifications` (`recipientUserId`,`readAt`);--> statement-breakpoint
CREATE INDEX `reports_created_idx` ON `reports` (`createdAt`);