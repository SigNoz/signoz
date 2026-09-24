import { processorFields } from '../PipelineListsView/AddNewProcessor/config';
import { resolveProcessorFields } from '../PipelineListsView/AddNewProcessor/utils';

const parseFromDefault = (
	fields: ReturnType<typeof resolveProcessorFields>,
): unknown => fields.find((field) => field.name === 'parse_from')?.initialValue;

describe('resolveProcessorFields', () => {
	it.each(['grok_parser', 'regex_parser', 'json_parser'])(
		'defaults %s parse_from to body.message when use_json_body is on',
		(processorType) => {
			expect(parseFromDefault(resolveProcessorFields(processorType, true))).toBe(
				'body.message',
			);
		},
	);

	it.each(['grok_parser', 'regex_parser', 'json_parser'])(
		'keeps %s parse_from as body when use_json_body is off',
		(processorType) => {
			expect(parseFromDefault(resolveProcessorFields(processorType, false))).toBe(
				'body',
			);
		},
	);

	it('leaves parse_from defaults that do not point at the body alone', () => {
		expect(parseFromDefault(resolveProcessorFields('time_parser', true))).toBe(
			'attributes.timestamp',
		);
		expect(
			parseFromDefault(resolveProcessorFields('severity_parser', true)),
		).toBe('attributes.logLevel');
	});

	it('does not mutate the shared config', () => {
		resolveProcessorFields('grok_parser', true);

		expect(parseFromDefault(processorFields.grok_parser)).toBe('body');
	});

	it('returns an empty list for an unknown processor type', () => {
		expect(resolveProcessorFields('does_not_exist', true)).toStrictEqual([]);
	});
});
