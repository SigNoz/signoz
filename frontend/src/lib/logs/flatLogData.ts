import { defaultTo } from 'lodash-es';
import { ILog } from 'types/api/logs/log';

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
		id: 'id',
		timestamp: 'log.timestamp:string',
		body: 'log.body:string',
		span_id: 'log.span_id:string',
		trace_id: 'log.trace_id:string',
		trace_flags: 'log.trace_flags:number',
		severity_text: 'log.severity_text:string',
		severity_number: 'log.severity_number:number',
		scope_name: 'scope.scope_name:string',
		scope_version: 'scope.scope_version:string',
	};

	Object.entries(topLevelFieldsToContextMapping).forEach(([field, key]) => {
		const value = log[field as keyof ILog];
		if (value !== undefined && value !== null) {
			flattenLogObject[key] = String(value);
		}
	});

	return flattenLogObject;
}
