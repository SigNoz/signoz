export interface TelemetryFieldValues {
	StringValues?: string[];
	NumberValues?: number[];
	RelatedValues?: string[];
	[key: string]: string[] | number[] | boolean[] | undefined;
}

/**
 * Response from the field values API
 */
export interface FieldValueResponse {
	/** List of field values returned by type */
	values: TelemetryFieldValues;
	/** Normalized values combined from all types */
	normalizedValues?: string[];
	/** Related values from the field */
	relatedValues?: string[];
	/** Indicates if the returned list is complete */
	complete: boolean;
}
