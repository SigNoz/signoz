import { defaultTo } from 'lodash-es';
import { ILog } from 'types/api/logs/log';

// Exported constants for top-level field mappings
export const LOG_FIELD_ID_KEY = 'id';
export const LOG_FIELD_TIMESTAMP_KEY = 'log.timestamp:string';
export const LOG_FIELD_BODY_KEY = 'log.body:string';
export const LOG_FIELD_SPAN_ID_KEY = 'log.span_id:string';
export const LOG_FIELD_TRACE_ID_KEY = 'log.trace_id:string';
export const LOG_FIELD_TRACE_FLAGS_KEY = 'log.trace_flags:number';
export const LOG_FIELD_SEVERITY_TEXT_KEY = 'log.severity_text:string';
export const LOG_FIELD_SEVERITY_NUMBER_KEY = 'log.severity_number:number';
export const LOG_FIELD_SCOPE_NAME_KEY = 'scope.scope_name:string';
export const LOG_FIELD_SCOPE_VERSION_KEY = 'scope.scope_version:string';

export function FlatLogData(log: ILog): Record<string, string> {
	const flattenLogObject: Record<string, string> = {};

	// Map of field names to their contexts and data types
	const fieldMappings: Record<string, { context: string; datatype: string }> = {
		resources_string: { context: 'resource', datatype: 'string' },
		scope_string: { context: 'scope', datatype: 'string' },
		attributes_string: { context: 'attribute', datatype: 'string' },
		attributes_number: { context: 'attribute', datatype: 'number' },
		attributes_bool: { context: 'attribute', datatype: 'bool' },
	};

	// Flatten specific fields with context and datatype
	Object.entries(fieldMappings).forEach(([fieldKey, { context, datatype }]) => {
		const fieldData = log[fieldKey as keyof ILog];
		if (fieldData && typeof fieldData === 'object') {
			Object.entries(defaultTo(fieldData, {})).forEach(([key, value]) => {
				const flatKey = `${context}.${key}:${datatype}`;
				flattenLogObject[flatKey] = String(value);
			});
		}
	});

	// Add top-level fields
	const topLevelFieldsToContextMapping: Record<string, string> = {
		id: LOG_FIELD_ID_KEY,
		timestamp: LOG_FIELD_TIMESTAMP_KEY,
		body: LOG_FIELD_BODY_KEY,
		span_id: LOG_FIELD_SPAN_ID_KEY,
		trace_id: LOG_FIELD_TRACE_ID_KEY,
		trace_flags: LOG_FIELD_TRACE_FLAGS_KEY,
		severity_text: LOG_FIELD_SEVERITY_TEXT_KEY,
		severity_number: LOG_FIELD_SEVERITY_NUMBER_KEY,
		scope_name: LOG_FIELD_SCOPE_NAME_KEY,
		scope_version: LOG_FIELD_SCOPE_VERSION_KEY,
	};

	Object.entries(topLevelFieldsToContextMapping).forEach(([field, key]) => {
		const value = log[field as keyof ILog];
		if (value !== undefined && value !== null) {
			flattenLogObject[key] = String(value);
		}
	});

	return flattenLogObject;
}
