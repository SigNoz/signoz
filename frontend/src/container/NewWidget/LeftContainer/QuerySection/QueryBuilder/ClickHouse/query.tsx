import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Fullscreen, Minimize } from '@signozhq/icons';
import { Input } from 'antd';
import { LEGEND } from 'constants/global';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { getFormatedLegend } from 'utils/getFormatedLegend';

import QueryHeader from '../QueryHeader';

import './ClickHouse.styles.scss';

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
	const { handleSetQueryItemData, removeQueryTypeItemByIndex } =
		useQueryBuilder();

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

	// Fullscreen editor state
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Handle Escape key to close fullscreen
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (e.key === 'Escape' && isFullscreen) {
				setIsFullscreen(false);
			}
		};

		if (isFullscreen) {
			document.addEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	}, [isFullscreen]);

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

	const editorOptions = {
		scrollbar: {
			alwaysConsumeMouseWheel: false,
		},
		minimap: {
			enabled: isFullscreen,
		},
		fontSize: 14,
		fontFamily: 'Space Mono',
		wordWrap: 'on' as const,
		lineNumbers: 'on' as const,
		scrollBeyondLastLine: false,
		automaticLayout: true,
	};

	return (
		<>
			<QueryHeader
				name={queryData?.name}
				disabled={queryData?.disabled}
				onDisable={handleDisable}
				onDelete={handleRemoveQuery}
				deletable={deletable}
			>
				<div className="clickhouse-query-editor-wrapper">
					<MEditor
						language="sql"
						height="200px"
						onChange={handleUpdateEditor}
						value={queryData?.query}
						onMount={(_, monaco): void => {
							document.fonts.ready.then(() => {
								monaco.editor.remeasureFonts();
							});
						}}
						options={editorOptions}
						theme={isDarkMode ? 'my-theme' : 'light'}
						beforeMount={setEditorTheme}
					/>
					<button
						type="button"
						className="clickhouse-fullscreen-btn"
						onClick={(): void => setIsFullscreen(true)}
						data-testid="clickhouse-expand-editor"
						title="Expand editor to fullscreen"
					>
						<Fullscreen size={16} />
					</button>
				</div>
				<Input
					onChange={handleUpdateInput}
					name="legend"
					size="middle"
					defaultValue={queryData?.legend}
					value={queryData?.legend}
					addonBefore="Legend Format"
				/>
			</QueryHeader>

			{/* Fullscreen editor modal */}
			{isFullscreen && (
				<div className="clickhouse-fullscreen-overlay">
					<div className="clickhouse-fullscreen-container">
						<div className="clickhouse-fullscreen-header">
							<span className="clickhouse-fullscreen-title">
								ClickHouse Query Editor
							</span>
							<button
								type="button"
								className="clickhouse-fullscreen-close-btn"
								onClick={(): void => setIsFullscreen(false)}
								data-testid="clickhouse-collapse-editor"
							>
								<Minimize size={18} />
								<span>Collapse</span>
							</button>
						</div>
						<div className="clickhouse-fullscreen-editor">
							<MEditor
								language="sql"
								height="100%"
								onChange={handleUpdateEditor}
								value={queryData?.query}
								onMount={(_, monaco): void => {
									document.fonts.ready.then(() => {
										monaco.editor.remeasureFonts();
									});
								}}
								options={{
									...editorOptions,
									minimap: { enabled: true },
									fontSize: 15,
								}}
								theme={isDarkMode ? 'my-theme' : 'light'}
								beforeMount={setEditorTheme}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default ClickHouseQueryBuilder;
