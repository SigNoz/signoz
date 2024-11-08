import './Overview.styles.scss';

import MEditor, { EditorProps, Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Collapse,
	Divider,
	Input,
	Switch,
	Tag,
	Typography,
} from 'antd';
import { AddToQueryHOCProps } from 'components/Logs/AddToQueryHOC';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { ActionItemProps } from './ActionItem';
import TableView from './TableView';
import { removeEscapeCharacters } from './utils';

interface OverviewProps {
	logData: ILog;
	isListViewPanel?: boolean;
	selectedOptions: OptionsQuery;
	listViewPanelSelectedFields?: IField[] | null;
	onGroupByAttribute?: (
		fieldKey: string,
		isJSON?: boolean,
		dataType?: DataTypes,
	) => Promise<void>;
}

type Props = OverviewProps &
	Partial<Pick<ActionItemProps, 'onClickActionItem'>> &
	Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function Overview({
	logData,
	onAddToQuery,
	onClickActionItem,
	isListViewPanel = false,
	selectedOptions,
	onGroupByAttribute,
	listViewPanelSelectedFields,
}: Props): JSX.Element {
	const [isWrapWord, setIsWrapWord] = useState<boolean>(true);
	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const [isAttributesExpanded, setIsAttributesExpanded] = useState<boolean>(
		true,
	);
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const isDarkMode = useIsDarkMode();

	const options: EditorProps['options'] = {
		automaticLayout: true,
		readOnly: true,
		height: '40vh',
		wordWrap: isWrapWord ? 'on' : 'off',
		minimap: {
			enabled: false,
		},
		fontWeight: 400,
		fontFamily: 'Geist Mono',
		fontSize: 13,
		lineHeight: '18px',
		colorDecorators: true,
		scrollBeyondLastLine: false,
		scrollbar: {
			vertical: 'hidden',
			horizontal: 'hidden',
		},
	};

	const handleWrapWord = (checked: boolean): void => {
		setIsWrapWord(checked);
	};

	function setEditorTheme(monaco: Monaco): void {
		monaco.editor.defineTheme('my-theme', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
				{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
			],
			colors: {
				'editor.background': Color.BG_INK_400,
			},
		});
	}

	const handleSearchVisible = (): void => {
		setIsSearchVisible(!isSearchVisible);
	};

	const toogleAttributePanelOpenState = (): void => {
		setIsAttributesExpanded(!isAttributesExpanded);
	};

	return (
		<div className="overview-container">
			<Collapse
				defaultActiveKey={['1']}
				// eslint-disable-next-line react/no-unstable-nested-components
				expandIcon={(props): ReactNode =>
					props.isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />
				}
				items={[
					{
						key: '1',
						label: (
							<Tag bordered={false}>
								<Typography.Text style={{ color: Color.BG_ROBIN_400 }}>
									body
								</Typography.Text>
							</Tag>
						),
						children: (
							<div className="logs-body-content">
								<MEditor
									value={removeEscapeCharacters(logData.body)}
									language="json"
									options={options}
									onChange={(): void => {}}
									height="20vh"
									theme={isDarkMode ? 'my-theme' : 'light'}
									onMount={(_, monaco): void => {
										document.fonts.ready.then(() => {
											monaco.editor.remeasureFonts();
										});
									}}
									// eslint-disable-next-line react/jsx-no-bind
									beforeMount={setEditorTheme}
								/>
								<Divider
									style={{
										margin: 0,
										border: isDarkMode
											? `1px solid ${Color.BG_SLATE_500}`
											: `1px solid ${Color.BG_VANILLA_200}`,
									}}
								/>
								<div className="log-switch">
									<div className="wrap-word-switch">
										<Typography.Text>Wrap text</Typography.Text>
										<Switch checked={isWrapWord} onChange={handleWrapWord} size="small" />
									</div>
								</div>
							</div>
						),
						// extra: <Tag className="tag">JSON</Tag>,
						className: 'collapse-content',
					},
				]}
			/>

			<Collapse
				className="attribute-table"
				defaultActiveKey={['1']}
				bordered={false}
				// eslint-disable-next-line react/no-unstable-nested-components
				expandIcon={(props): ReactNode =>
					props.isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />
				}
				items={[
					{
						key: '1',
						label: (
							// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
							<div
								className="attribute-tab-header"
								onClick={toogleAttributePanelOpenState}
							>
								<Tag bordered={false}>
									<Typography.Text style={{ color: Color.BG_ROBIN_400 }}>
										Attributes
									</Typography.Text>
								</Tag>

								{isAttributesExpanded && (
									<Button
										className="action-btn"
										icon={<Search size={12} />}
										onClick={(e): void => {
											e.stopPropagation();
											handleSearchVisible();
										}}
									/>
								)}
							</div>
						),
						children: (
							<>
								{isSearchVisible && (
									<Input
										autoFocus
										placeholder="Search for a field..."
										className="search-input"
										value={fieldSearchInput}
										onChange={(e): void => setFieldSearchInput(e.target.value)}
									/>
								)}

								<TableView
									logData={logData}
									onAddToQuery={onAddToQuery}
									fieldSearchInput={fieldSearchInput}
									onGroupByAttribute={onGroupByAttribute}
									onClickActionItem={onClickActionItem}
									isListViewPanel={isListViewPanel}
									selectedOptions={selectedOptions}
									listViewPanelSelectedFields={listViewPanelSelectedFields}
								/>
							</>
						),
						className: 'collapse-content attribute-collapse',
					},
				]}
			/>
		</div>
	);
}

Overview.defaultProps = {
	isListViewPanel: false,
	listViewPanelSelectedFields: null,
	onGroupByAttribute: undefined,
};

export default Overview;
