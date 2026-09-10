import { processorFields, ProcessorFormField } from './config';

const BODY_PARSE_FROM = 'body';
const JSON_BODY_PARSE_FROM = 'body.message';

// With use_json_body the collector normalizes every body into a map before user
// operators run, so a parser pointed at `body` gets a map it cannot read and
// silently extracts nothing. The log text lives at body.message.
export function resolveProcessorFields(
	processorType: string,
	isBodyJsonEnabled: boolean,
): Array<ProcessorFormField> {
	const fields = processorFields[processorType] ?? [];

	if (!isBodyJsonEnabled) {
		return fields;
	}

	return fields.map((field) =>
		field.name === 'parse_from' && field.initialValue === BODY_PARSE_FROM
			? { ...field, initialValue: JSON_BODY_PARSE_FROM }
			: field,
	);
}
