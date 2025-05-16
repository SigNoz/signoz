/**
 * Response from the field values API
 */
export interface FieldValueResponse {
	/** List of field values returned by type */
	values: Record<string, (string | boolean | number)[]>;
	/** Normalized values combined from all types */
	normalizedValues?: string[];
	/** Indicates if the returned list is complete */
	complete: boolean;
}
