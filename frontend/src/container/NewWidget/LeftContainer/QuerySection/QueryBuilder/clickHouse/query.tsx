import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Input } from 'antd';
import { LEGEND } from 'constants/global';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChangeEvent, useCallback } from 'react';
import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { getFormatedLegend } from 'utils/getFormatedLegend';

import QueryHeader from '../QueryHeader';

interface IClickHouseQueryBuilderProps {
	queryData: IClickHouseQuery;
	queryIndex: number;
	deletable: boolean;
}

function ClickHouseQueryBuilder({
	queryData,
	queryIndex,
	deletable,
}: IClickHouseQueryBuilderProps): JSX.Element | null {
	const {
		handleSetQueryItemData,
		removeQueryTypeItemByIndex,
	} = useQueryBuilder();

	const handleRemoveQuery = useCallback(() => {
		removeQueryTypeItemByIndex(EQueryType.CLICKHOUSE, queryIndex);
	}, [queryIndex, removeQueryTypeItemByIndex]);

	const handleUpdateQuery = useCallback(
		<Field extends keyof IClickHouseQuery, Value extends IClickHouseQuery[Field]>(
			field: keyof IClickHouseQuery,
			value: Value,
		) => {
			const newQuery: IClickHouseQuery = { ...queryData, [field]: value };

			handleSetQueryItemData(queryIndex, EQueryType.CLICKHOUSE, newQuery);
		},
		[handleSetQueryItemData, queryIndex, queryData],
	);

	const handleDisable = useCallback(() => {
		const newQuery: IClickHouseQuery = {
			...queryData,
			disabled: !queryData.disabled,
		};

		handleSetQueryItemData(queryIndex, EQueryType.CLICKHOUSE, newQuery);
	}, [handleSetQueryItemData, queryData, queryIndex]);

	const handleUpdateEditor = useCallback(
		(value: string | undefined) => {
			if (value !== undefined) {
				handleUpdateQuery('query', value);
			}
		},
		[handleUpdateQuery],
	);

	const handleUpdateInput = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const { name } = e.target;
			let { value } = e.target;
			if (name === LEGEND) {
				value = getFormatedLegend(value);
			}
			handleUpdateQuery(name as keyof IClickHouseQuery, value);
		},
		[handleUpdateQuery],
	);

	const isDarkMode = useIsDarkMode();

	function setEditorTheme(monaco: Monaco): void {
		monaco.editor.defineTheme('my-theme', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
				{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
			],
			colors: {
				'editor.background': Color.BG_INK_300,
			},
		});
	}

	return (
		<QueryHeader
			name={queryData.name}
			disabled={queryData.disabled}
			onDisable={handleDisable}
			onDelete={handleRemoveQuery}
			deletable={deletable}
		>
			<MEditor
				language="sql"
				height="200px"
				onChange={handleUpdateEditor}
				value={queryData.query}
				onMount={(_, monaco): void => {
					document.fonts.ready.then(() => {
						monaco.editor.remeasureFonts();
					});
				}}
				options={{
					scrollbar: {
						alwaysConsumeMouseWheel: false,
					},
					minimap: {
						enabled: false,
					},
					fontSize: 14,
					fontFamily: 'Space Mono',
				}}
				theme={isDarkMode ? 'my-theme' : 'light'}
				// eslint-disable-next-line react/jsx-no-bind
				beforeMount={setEditorTheme}
			/>
			<Input
				onChange={handleUpdateInput}
				name="legend"
				size="middle"
				defaultValue={queryData.legend}
				value={queryData.legend}
				addonBefore="Legend Format"
			/>
		</QueryHeader>
	);
}

export default ClickHouseQueryBuilder;
