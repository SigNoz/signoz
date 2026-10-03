export interface SemconvMigrationReportEntry {
	current: string;
	old: string;
	signal: string;
	services: string[];
	resourceSets: number;
	lastSeenUnixMilli: number;
}

export interface SemconvMigrationReport {
	startUnixMilli: number;
	endUnixMilli: number;
	entries: SemconvMigrationReportEntry[];
}
