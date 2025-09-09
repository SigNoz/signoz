export interface ExportRawDataProps {
	source: string;
	format: string;
	start: number;
	end: number;
	columns?: string[];
	filter: string | null;
	orderBy: string | null;
	limit: number | null;
}
