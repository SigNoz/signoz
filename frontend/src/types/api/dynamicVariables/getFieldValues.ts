/**
 * Response from the field values API
 */
export interface FieldValueResponse {
	/** List of field values returned */
	values: string[];
	/** Indicates if the returned list is complete */
	complete: boolean;
}
