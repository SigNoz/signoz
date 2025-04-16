/**
 * Response from the field keys API
 */
export interface FieldKeyResponse {
	/** List of field keys returned */
	keys: FieldKey[];
	/** Indicates if the returned list is complete */
	complete: boolean;
}

/**
 * Field key data structure
 */
export interface FieldKey {
	/** Key name */
	key: string;
	/** Data type of the field */
	dataType: string;
	/** Type of the field */
	type: string;
}
