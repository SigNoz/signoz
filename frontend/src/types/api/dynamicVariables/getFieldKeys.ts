/**
 * Response from the field keys API
 */
export interface FieldKeyResponse {
	/** List of field keys returned */
	keys?: Record<string, FieldKey[]>;
	/** Indicates if the returned list is complete */
	complete?: boolean;
}

/**
 * Field key data structure
 */
export interface FieldKey {
	/** Key name */
	name?: string;
	/** Data type of the field */
	fieldDataType?: string;
	/** Signal type */
	signal?: string;
	/** Field context */
	fieldContext?: string;
}
