import './Overview.styles.scss';

import MEditor, { EditorProps } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Collapse, Switch, Tag, Typography } from 'antd';
import { AddToQueryHOCProps } from 'components/Logs/AddToQueryHOC';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';

import TableView from './TableView';
import { aggregateAttributesResourcesToString } from './utils';

interface OverviewProps {
	logData: ILog;
	fieldSearchInput: string;
}

type Props = OverviewProps & Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function Overview({
	logData,
	onAddToQuery,
	fieldSearchInput,
}: Props): JSX.Element {
	const [isWrapWord, setIsWrapWord] = useState<boolean>(true);

	const logJsonData = useMemo(
		() => aggregateAttributesResourcesToString(logData),
		[logData],
	);

	const isDarkMode = useIsDarkMode();

	const options: EditorProps['options'] = {
		automaticLayout: true,
		readOnly: true,
		height: '40vh',
		wordWrap: 'on',
		minimap: {
			enabled: false,
		},
		fontWeight: 400,
		fontFamily: 'SF Mono',
		fontSize: 14,
		lineHeight: '18px',
		colorDecorators: true,
		scrollBeyondLastLine: false,
	};

	const handleWrapWord = (checked: boolean): void => {
		setIsWrapWord(checked);
	};

	return (
		<div className="overview-container">
			<Collapse
				bordered={false}
				defaultActiveKey={['1']}
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
							<>
								<MEditor
									value={isWrapWord ? JSON.stringify(logData) : logJsonData}
									language={isWrapWord ? 'placetext' : 'json'}
									options={options}
									onChange={(): void => {}}
									height="40vh"
									theme={isDarkMode ? 'vs-dark' : 'vs-light'}
								/>
								<div className="log-switch">
									<div className="wrap-word-switch">
										<Typography.Text>Wrap text</Typography.Text>
										<Switch checked={isWrapWord} onChange={handleWrapWord} />
									</div>
									<div>
										<Button className="log-switch-btn" icon={<ChevronLeft size={16} />} />
										<Button
											className="log-switch-btn"
											icon={<ChevronRight size={16} />}
										/>
									</div>
								</div>
							</>
						),
						extra: <Tag className="tag">{isWrapWord ? 'Raw' : 'JSON'}</Tag>,
						className: 'collapse-content',
					},
				]}
			/>

			<Collapse
				className="attribute-table"
				defaultActiveKey={['1']}
				bordered={false}
				items={[
					{
						key: '1',
						label: (
							<Tag bordered={false}>
								<Typography.Text style={{ color: Color.BG_ROBIN_400 }}>
									Attribute
								</Typography.Text>
							</Tag>
						),
						children: (
							<TableView
								logData={logData}
								onAddToQuery={onAddToQuery}
								fieldSearchInput={fieldSearchInput}
							/>
						),
						className: 'collapse-content',
					},
				]}
			/>
		</div>
	);
}

export default Overview;
