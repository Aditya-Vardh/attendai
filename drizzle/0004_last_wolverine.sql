ALTER TABLE `users` ADD `faceDescriptor` text;--> statement-breakpoint
ALTER TABLE `users` ADD `faceConsentGiven` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `faceEnrolledAt` timestamp;