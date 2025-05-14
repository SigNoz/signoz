/**
 * Response from the field values API
 */
export interface FieldValueResponse {
	/** List of field values returned */
	values: { stringValues: string[] };
	/** Indicates if the returned list is complete */
	complete: boolean;
}
