import { createElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import type { NotificationInstance } from 'antd/es/notification/interface';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import {
	FormattingOptions,
	PreferenceContextValue,
	PreferenceSlice,
} from 'providers/preferences/types';
import { renderHook } from 'tests/test-utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { FontSize } from '../types';
import useOptionsMenu from '../useOptionsMenu';

// Mock all dependencies
jest.mock('hooks/useNotifications');
jest.mock('providers/preferences/context/PreferenceContextProvider');
jest.mock('hooks/useUrlQueryData');
jest.mock('hooks/querySuggestions/useGetQueryKeySuggestions');

const mockUseNotifications = jest.mocked(useNotifications);
const mockUsePreferenceContext = jest.mocked(usePreferenceContext);
const mockUseUrlQueryData = jest.mocked(useUrlQueryData);
const mockUseGetQueryKeySuggestions = jest.mocked(useGetQueryKeySuggestions);

type KeySuggestionsResult = ReturnType<typeof useGetQueryKeySuggestions>;

// The hook reads only `data.data.data.keys` and `isFetching`.
const keySuggestions = (
	attributeKeys: Record<string, string>[],
): KeySuggestionsResult =>
	({
		data: { data: { data: { complete: true, keys: { attributeKeys } } } },
		isFetching: false,
	}) as unknown as KeySuggestionsResult;

const wrapper = ({ children }: { children: ReactNode }): JSX.Element =>
	createElement(QueryClientProvider, { client: new QueryClient() }, children);

const toIds = (columns: TelemetryFieldKey[]): string[] =>
	columns.map((column) => `${column.fieldContext}:${column.name}`);

describe('useOptionsMenu', () => {
	const mockNotifications = {
		error: jest.fn() as jest.MockedFunction<NotificationInstance['error']>,
		success: jest.fn() as jest.MockedFunction<NotificationInstance['success']>,
	} as Partial<NotificationInstance> as NotificationInstance;
	const mockUpdateColumns = jest.fn() as jest.MockedFunction<
		PreferenceSlice['updateColumns']
	>;
	const mockUpdateFormatting = jest.fn() as jest.MockedFunction<
		PreferenceSlice['updateFormatting']
	>;
	const mockRedirectWithQuery = jest.fn() as jest.MockedFunction<
		(newQueryData: unknown) => void
	>;

	const slice = (
		columns: TelemetryFieldKey[],
		formatting: FormattingOptions,
	): PreferenceSlice => ({
		preferences: { columns, formatting },
		loading: false,
		error: null,
		updateColumns: mockUpdateColumns,
		updateFormatting: mockUpdateFormatting,
	});

	const rawFormatting: FormattingOptions = {
		format: 'raw',
		maxLines: 1,
		fontSize: FontSize.SMALL,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockUseNotifications.mockReturnValue({
			notifications: mockNotifications,
		});

		mockUsePreferenceContext.mockReturnValue({
			[SavedviewtypesSourceDTO.traces]: slice([], rawFormatting),
			[SavedviewtypesSourceDTO.logs]: slice([], rawFormatting),
		} satisfies PreferenceContextValue);

		mockUseUrlQueryData.mockReturnValue({
			query: null,
			queryData: undefined,
			redirectWithQuery: mockRedirectWithQuery,
		});
	});

	it('does not show isRoot or isEntryPoint in column options when sourcePage is traces', () => {
		// Mock the query key suggestions to return data including isRoot and isEntryPoint
		mockUseGetQueryKeySuggestions.mockReturnValue(
			keySuggestions([
				{
					name: 'isRoot',
					signal: 'traces',
					fieldDataType: 'bool',
					fieldContext: '',
				},
				{
					name: 'isEntryPoint',
					signal: 'traces',
					fieldDataType: 'bool',
					fieldContext: '',
				},
				{
					name: 'duration',
					signal: 'traces',
					fieldDataType: 'float64',
					fieldContext: '',
				},
				{
					name: 'serviceName',
					signal: 'traces',
					fieldDataType: 'string',
					fieldContext: '',
				},
			]),
		);

		const { result } = renderHook(
			() =>
				useOptionsMenu({
					sourcePage: SavedviewtypesSourceDTO.traces,
					aggregateOperator: 'count',
				}),
			{ wrapper },
		);

		// Get the column options from the config
		const columnOptions = result.current.config.addColumn?.options ?? [];
		const optionNames = columnOptions.map((option) => option.label);

		// isRoot and isEntryPoint should NOT be in the options
		expect(optionNames).not.toContain('isRoot');
		expect(optionNames).not.toContain('body');
		expect(optionNames).not.toContain('isEntryPoint');

		// Other attributes should be present
		expect(optionNames).toContain('duration');
		expect(optionNames).toContain('serviceName');
	});

	it('shows body in column options when sourcePage is logs', () => {
		// Mock the query key suggestions to return data including body
		mockUseGetQueryKeySuggestions.mockReturnValue(
			keySuggestions([
				{
					name: 'body',
					signal: 'logs',
					fieldDataType: 'string',
					fieldContext: '',
				},
				{
					name: 'level',
					signal: 'logs',
					fieldDataType: 'string',
					fieldContext: '',
				},
				{
					name: 'timestamp',
					signal: 'logs',
					fieldDataType: 'int64',
					fieldContext: '',
				},
			]),
		);

		const { result } = renderHook(
			() =>
				useOptionsMenu({
					sourcePage: SavedviewtypesSourceDTO.logs,
					aggregateOperator: 'count',
				}),
			{ wrapper },
		);

		// Get the column options from the config
		const columnOptions = result.current.config.addColumn?.options ?? [];
		const optionNames = columnOptions.map((option) => option.label);

		// body should be in the options
		expect(optionNames).toContain('body');

		// Other attributes should be present
		expect(optionNames).toContain('level');
		expect(optionNames).toContain('timestamp');
	});

	describe('reorderSelectColumns / handleRemoveSelectedColumn — composite ID lookup', () => {
		const baseFormatting: FormattingOptions = {
			format: 'table',
			maxLines: 1,
			fontSize: FontSize.SMALL,
		};

		// Two entries share the same `name` but differ in `fieldContext` — the
		// exact case composite IDs are meant to disambiguate.
		const seedColumns: TelemetryFieldKey[] = [
			{
				name: 'body',
				fieldContext: 'log',
				fieldDataType: 'string',
				signal: 'logs',
			},
			{
				name: 'service.name',
				fieldContext: 'resource',
				fieldDataType: 'string',
				signal: 'logs',
			},
			{
				name: 'service.name',
				fieldContext: 'attribute',
				fieldDataType: 'string',
				signal: 'logs',
			},
			{
				name: 'timestamp',
				fieldContext: 'log',
				signal: 'logs',
			},
		];

		beforeEach(() => {
			mockUseGetQueryKeySuggestions.mockReturnValue(keySuggestions([]));
			mockUsePreferenceContext.mockReturnValue({
				[SavedviewtypesSourceDTO.traces]: slice([], baseFormatting),
				[SavedviewtypesSourceDTO.logs]: slice(seedColumns, baseFormatting),
			} satisfies PreferenceContextValue);
		});

		it('reorders by composite IDs — preserves both same-name variants distinctly', () => {
			const { result } = renderHook(
				() =>
					useOptionsMenu({
						sourcePage: SavedviewtypesSourceDTO.logs,
						aggregateOperator: 'count',
					}),
				{ wrapper },
			);

			// New order: [attribute:service.name, log:body, resource:service.name, log:timestamp]
			result.current.config.addColumn?.onReorder([
				'attribute:service.name:string',
				'log:body:string',
				'resource:service.name:string',
				'log:timestamp',
			]);

			expect(mockUpdateColumns).toHaveBeenCalledTimes(1);
			const reordered = mockUpdateColumns.mock.calls[0][0];
			expect(toIds(reordered)).toStrictEqual([
				'attribute:service.name',
				'log:body',
				'resource:service.name',
				'log:timestamp',
			]);
		});

		it('reorder ignores ids that are not columns (e.g. state-indicator) and skips unknown ids', () => {
			const { result } = renderHook(
				() =>
					useOptionsMenu({
						sourcePage: SavedviewtypesSourceDTO.logs,
						aggregateOperator: 'count',
					}),
				{ wrapper },
			);

			result.current.config.addColumn?.onReorder([
				'state-indicator',
				'log:timestamp',
				'unknown.composite',
				'log:body:string',
				'resource:service.name:string',
				'attribute:service.name:string',
			]);

			const reordered = mockUpdateColumns.mock.calls[0][0];
			// state-indicator + unknown.composite filtered; rest preserved in given order.
			expect(toIds(reordered)).toStrictEqual([
				'log:timestamp',
				'log:body',
				'resource:service.name',
				'attribute:service.name',
			]);
		});

		it('removes only the variant whose composite ID matches', () => {
			const { result } = renderHook(
				() =>
					useOptionsMenu({
						sourcePage: SavedviewtypesSourceDTO.logs,
						aggregateOperator: 'count',
					}),
				{ wrapper },
			);

			// Removing 'resource:service.name' should drop ONLY the resource variant.
			result.current.config.addColumn?.onRemove('resource:service.name:string');

			expect(mockUpdateColumns).toHaveBeenCalledTimes(1);
			const remaining = mockUpdateColumns.mock.calls[0][0];
			expect(toIds(remaining)).toStrictEqual([
				'log:body',
				'attribute:service.name',
				'log:timestamp',
			]);
		});

		it('removing by a non-matching composite ID is a no-op (filter returns the full list)', () => {
			const { result } = renderHook(
				() =>
					useOptionsMenu({
						sourcePage: SavedviewtypesSourceDTO.logs,
						aggregateOperator: 'count',
					}),
				{ wrapper },
			);

			result.current.config.addColumn?.onRemove('unknown.composite');

			const remaining = mockUpdateColumns.mock.calls[0][0];
			// No entries match → full list preserved.
			expect(remaining).toHaveLength(seedColumns.length);
		});
	});

	describe('fieldsSelector.value drops legacy columns without a name', () => {
		it('excludes entries missing name while keeping valid columns', () => {
			mockUseGetQueryKeySuggestions.mockReturnValue(keySuggestions([]));
			mockUsePreferenceContext.mockReturnValue({
				[SavedviewtypesSourceDTO.traces]: slice(
					[
						{ name: 'body', fieldContext: 'log' },
						// A legacy stored column: `key` only, no `name`.
						{
							key: 'legacy-key-no-name',
							fieldContext: 'log',
						} as unknown as TelemetryFieldKey,
						{ name: 'timestamp', fieldContext: 'log' },
					],
					{
						format: 'table',
						maxLines: 1,
						fontSize: FontSize.SMALL,
					},
				),
				[SavedviewtypesSourceDTO.logs]: slice([], {}),
			} satisfies PreferenceContextValue);

			const { result } = renderHook(
				() =>
					useOptionsMenu({
						sourcePage: SavedviewtypesSourceDTO.traces,
						aggregateOperator: 'count',
					}),
				{ wrapper },
			);

			const fields = result.current.config.fieldsSelector?.value ?? [];
			expect(fields.map((f) => f.name)).toStrictEqual(['body', 'timestamp']);
		});
	});
});
