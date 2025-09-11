export interface ExportRawDataProps {
	source: string;
	format: string;
	start: number;
	end: number;
	columns: string[];
	filter: string;
	orderBy: string;
	limit: number;
}
