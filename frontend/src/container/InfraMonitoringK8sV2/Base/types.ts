export type K8sBaseFilters = {
	filter: {
		expression: string;
		filterByStatus?: 'active' | 'inactive' | '';
	};
	groupBy?: Array<{ name: string }>;
	offset?: number;
	limit?: number;
	start: number;
	end: number;
	orderBy?: {
		key: { name: string };
		direction: 'asc' | 'desc';
	};
};

export type K8sListResponse<T> = {
	type: 'list' | 'grouped_list';
	records: T[];
	total: number;
	endTimeBeforeRetention?: boolean;
	error?: string | null;
};

/**
 * Type for table row data with required key fields.
 * Used when rendering raw data in the table.
 */
export type K8sTableRowData<T> = T & {
	key: string;
	id: string;
	itemKey: string;
	/** Metadata about which attributes were used for grouping */
	groupedByMeta?: Record<string, string>;
};
