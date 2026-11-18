import type { Completion } from '@codemirror/autocomplete';
import {
	type GetFieldsKeys200,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap } from 'constants/queryBuilder';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import { getCalculatedTraceFieldInfo } from '../QuerySearch/calculatedTraceFieldInfo';
import QuerySearch from '../QuerySearch/QuerySearch';
import { mockCodeMirrorDomApis } from './codemirrorDomMocks';

const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
const CM_OPTION_SELECTOR = '.cm-tooltip-autocomplete .cm-completionLabel';

beforeAll(() => {
	mockCodeMirrorDomApis();
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

// Shrink the suggestion-fetch debounce (300ms in prod) so these integration
// tests aren't paced by it; coalescing semantics stay intact.
jest.mock('../QuerySearch/constants', () => ({
	...jest.requireActual('../QuerySearch/constants'),
	SUGGESTION_FETCH_DEBOUNCE_MS: 30,
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => {
	const handleRunQuery = jest.fn();
	return {
		__esModule: true,
		useQueryBuilder: (): { handleRunQuery: () => void } => ({ handleRunQuery }),
		handleRunQuery,
	};
});

// Keys fixture: status.code exists as 3 variants (attribute string/number +
// resource string); attribute.a.b.c is a key literally named with the prefix.
const KEYS_FIXTURE = {
	'status.code': [
		{
			name: 'status.code',
			fieldContext: 'attribute',
			fieldDataType: 'string',
			signal: 'logs',
		},
		{
			name: 'status.code',
			fieldContext: 'attribute',
			fieldDataType: 'number',
			signal: 'logs',
		},
		{
			name: 'status.code',
			fieldContext: 'resource',
			fieldDataType: 'string',
			signal: 'logs',
		},
	],
	'attribute.a.b.c': [
		{
			name: 'attribute.a.b.c',
			fieldContext: 'attribute',
			fieldDataType: 'string',
			signal: 'logs',
		},
	],
	'duration.nano': [
		{
			name: 'duration.nano',
			fieldContext: 'span',
			fieldDataType: 'number',
			signal: 'logs',
		},
	],
};

const fetchedSearchTexts: string[] = [];

beforeEach(() => {
	fetchedSearchTexts.length = 0;
	server.use(
		rest.get('http://localhost/api/v1/fields/keys', (req, res, ctx) => {
			fetchedSearchTexts.push(req.url.searchParams.get('searchText') ?? '');
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { complete: true, keys: KEYS_FIXTURE },
				}),
			);
		}),
		rest.get('http://localhost/api/v1/fields/values', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { values: { stringValues: [], numberValues: [] } },
				}),
			),
		),
	);
});

async function renderAndType(
	text: string,
	dataSource: DataSource.LOGS | DataSource.TRACES = DataSource.LOGS,
): Promise<HTMLElement> {
	render(
		<QuerySearch
			onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
			queryData={initialQueriesMap[dataSource].builder.queryData[0]}
			dataSource={dataSource}
		/>,
	);

	await waitFor(() => {
		expect(document.querySelector(CM_EDITOR_SELECTOR)).toBeInTheDocument();
	});

	const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
	await userEvent.click(editor);
	await userEvent.type(editor, text);
	return editor;
}

// Types a key, waits for its suggestion to render (proving the debounced key
// fetch resolved into state), then types a space to enter operator context.
async function typeKeyThenEnterOperatorContext(
	key: string,
	expectedKeyLabel: string,
): Promise<void> {
	const editor = await renderAndType(key);

	await waitFor(() => {
		expect(visibleOptionLabels()).toContain(expectedKeyLabel);
	});

	// skipClick: a click would reset the caret to position 0 under the mocked
	// DOM rects; we need the space appended at the end of the typed key.
	await userEvent.type(editor, ' ', { skipClick: true });

	await waitFor(() => {
		expect(visibleOptionLabels()).toContain('=');
	});
}

function visibleOptionLabels(): string[] {
	return Array.from(document.querySelectorAll(CM_OPTION_SELECTOR)).map(
		(el) => el.textContent ?? '',
	);
}

describe('QuerySearch context-prefixed key suggestions', () => {
	it('shows one deduped suggestion per key name in normal mode', async () => {
		await renderAndType('statu');

		await waitFor(() => {
			expect(visibleOptionLabels()).toContain('status.code');
		});

		const statusOptions = visibleOptionLabels().filter(
			(label) => label === 'status.code',
		);
		expect(statusOptions).toHaveLength(1);
	});

	it('shows context-scoped suggestions for a complete context prefix', async () => {
		await renderAndType('attribute.');

		await waitFor(() => {
			expect(visibleOptionLabels()).toContain('attribute.status.code');
		});

		const labels = visibleOptionLabels();
		// Literal key name match ranks first
		expect(labels[0]).toBe('attribute.a.b.c');
		// Context-qualified form of the literal key is also present
		expect(labels).toContain('attribute.attribute.a.b.c');
		// span-only key is not suggested under attribute.
		expect(labels).not.toContain('attribute.duration.nano');
	});

	it('fetches the context page when the prefix is typed exactly', async () => {
		await renderAndType('attribute.');

		await waitFor(() => {
			expect(fetchedSearchTexts).toContain('attribute.');
		});
	});
});

describe('QuerySearch operator suggestions by key type', () => {
	it('shows all operators for a key with ambiguous types', async () => {
		// status.code is string + number across variants → no type filtering
		await typeKeyThenEnterOperatorContext('status.code', 'status.code');

		const labels = visibleOptionLabels();
		expect(labels).toContain('>');
		expect(labels).toContain('LIKE');
	});

	it('shows numeric operators for a single-type number key', async () => {
		await typeKeyThenEnterOperatorContext('duration.nano', 'duration.nano');

		const labels = visibleOptionLabels();
		expect(labels).toContain('>');
		expect(labels).not.toContain('LIKE');
	});

	it('narrows operators when a context prefix disambiguates the type', async () => {
		// status.code is ambiguous globally, but resource.status.code is string-only
		await typeKeyThenEnterOperatorContext(
			'resource.status.code',
			'resource.status.code',
		);

		const labels = visibleOptionLabels();
		expect(labels).toContain('LIKE');
		expect(labels).not.toContain('>');
	});
});

describe('QuerySearch calculated trace field suggestions', () => {
	it.each([
		{
			text: 'response_stat',
			fieldName: 'response_status_code',
			description:
				'Derived response status code from the HTTP/RPC status code attributes. Learn more [here](https://signoz.io/docs/traces-management/guides/derived-fields-spans/#response_status_code)',
			expectedText:
				'Derived response status code from the HTTP/RPC status code attributes.',
		},
		{
			text: 'span.response_stat',
			fieldName: 'response_status_code',
			description:
				'Derived response status code from the HTTP/RPC status code attributes. Learn more [here](https://signoz.io/docs/traces-management/guides/derived-fields-spans/#response_status_code)',
			expectedText:
				'Derived response status code from the HTTP/RPC status code attributes.',
		},
		{
			text: 'response_stat',
			fieldName: 'response_status_code',
			description: undefined,
			expectedText: 'http.response.status_code',
		},
		{
			text: 'is_rem',
			fieldName: 'is_remote',
			description: undefined,
			expectedText: 'Whether the span is remote.',
		},
	])(
		'shows derivation help for $text with API description $description',
		async ({ text, fieldName, description, expectedText }) => {
			server.use(
				rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								complete: true,
								keys: {
									[fieldName]: [
										{
											name: fieldName,
											description,
											fieldContext: TelemetrytypesFieldContextDTO.span,
											fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
											signal: TelemetrytypesSignalDTO.traces,
										},
									],
								},
							},
						} satisfies GetFieldsKeys200),
					),
				),
			);

			await renderAndType(text, DataSource.TRACES);

			const info = await screen.findByTestId('calculated-trace-field-info');
			expect(info).toHaveTextContent(expectedText);
			expect(info).not.toHaveTextContent('[here]');
			expect(screen.getByTestId('calculated-trace-field-docs')).toHaveAttribute(
				'href',
				`https://signoz.io/docs/traces-management/guides/derived-fields-spans/#${fieldName}`,
			);
		},
	);

	it.each([
		{ dataSource: DataSource.LOGS, fieldContext: 'span', label: 'http_method' },
		{
			dataSource: DataSource.METRICS,
			fieldContext: 'span',
			label: 'http_method',
		},
		{
			dataSource: DataSource.TRACES,
			fieldContext: 'attribute',
			label: 'http_method',
		},
		{
			dataSource: DataSource.TRACES,
			fieldContext: 'resource',
			label: 'http_method',
		},
		{
			dataSource: DataSource.TRACES,
			fieldContext: undefined,
			label: 'http_method',
		},
		{
			dataSource: DataSource.TRACES,
			fieldContext: 'span',
			label: 'service.name',
		},
		{ dataSource: DataSource.TRACES, fieldContext: 'span', label: 'toString' },
	])(
		'preserves existing help for $dataSource / $fieldContext / $label',
		({ dataSource, fieldContext, label }) => {
			const completion: Completion & { fieldContext?: string } = {
				label,
				fieldContext,
				info: 'Existing field help',
			};

			expect(getCalculatedTraceFieldInfo(completion, dataSource)).toBe(
				'Existing field help',
			);
		},
	);
});
