CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`cronExpression` varchar(80) NOT NULL,
	`lastRunDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_jobs_name_unique` UNIQUE(`name`),
	CONSTRAINT `scheduled_jobs_task_uid_unique` UNIQUE(`taskUid`)
);
