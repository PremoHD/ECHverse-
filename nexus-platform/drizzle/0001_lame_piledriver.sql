CREATE TABLE `hub_presence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hubId` int NOT NULL,
	`userId` int NOT NULL,
	`state` enum('active','away','left') NOT NULL DEFAULT 'active',
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hub_presence_id` PRIMARY KEY(`id`),
	CONSTRAINT `hub_presence_member_idx` UNIQUE(`hubId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `integration_health` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinationId` int NOT NULL,
	`state` enum('ready','degraded','offline','unknown') NOT NULL DEFAULT 'unknown',
	`detail` varchar(500) NOT NULL,
	`latencyMs` int,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSuccessAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_health_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_health_destinationId_unique` UNIQUE(`destinationId`)
);
--> statement-breakpoint
CREATE TABLE `metaverse_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`handle` varchar(80) NOT NULL,
	`kind` enum('browser','openusd','custom') NOT NULL,
	`launchUrl` varchar(2048) NOT NULL,
	`summary` text NOT NULL,
	`compatibility` text NOT NULL,
	`status` enum('ready','degraded','offline','pending') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metaverse_destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `metaverse_destinations_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `propagation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinationId` int NOT NULL,
	`scenePackageId` int,
	`createdBy` int NOT NULL,
	`operation` enum('publish','synchronize','health_check','retry') NOT NULL,
	`result` enum('queued','succeeded','failed','partial') NOT NULL,
	`severity` enum('info','warning','error') NOT NULL DEFAULT 'info',
	`recoverable` enum('yes','no') NOT NULL DEFAULT 'yes',
	`detail` text NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propagation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scene_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinationId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`sourceUri` varchar(2048) NOT NULL,
	`format` enum('usd','usda','usdc','usdz','glb','other') NOT NULL,
	`packageVersion` varchar(64) NOT NULL DEFAULT '1.0.0',
	`compatibility` text NOT NULL,
	`reviewState` enum('draft','reviewed','approved') NOT NULL DEFAULT 'draft',
	`contentHash` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scene_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spatial_hubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`handle` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`visibility` enum('members','invite') NOT NULL DEFAULT 'members',
	`state` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`capacity` int NOT NULL DEFAULT 24,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spatial_hubs_id` PRIMARY KEY(`id`),
	CONSTRAINT `spatial_hubs_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE INDEX `hub_presence_state_idx` ON `hub_presence` (`hubId`,`state`);--> statement-breakpoint
CREATE INDEX `destinations_status_idx` ON `metaverse_destinations` (`status`);--> statement-breakpoint
CREATE INDEX `propagation_events_destination_idx` ON `propagation_events` (`destinationId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `scene_packages_destination_idx` ON `scene_packages` (`destinationId`);--> statement-breakpoint
CREATE INDEX `spatial_hubs_state_idx` ON `spatial_hubs` (`state`);