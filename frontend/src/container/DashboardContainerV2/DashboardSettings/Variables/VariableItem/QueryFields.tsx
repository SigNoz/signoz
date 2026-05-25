import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import Editor from 'components/Editor';

import { LabelContainer } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	queryValue: string;
	onChange: (v: string) => void;
	onTestRun?: () => void;
	testRunLoading?: boolean;
	error?: string;
}

function QueryFields({
	queryValue,
	onChange,
	onTestRun,
	testRunLoading,
	error,
}: Props): JSX.Element {
	return (
		<div className="query-container">
			<LabelContainer>
				<Typography>Query</Typography>
			</LabelContainer>

			<div style={{ flex: 1, position: 'relative' }}>
				<Editor
					language="sql"
					value={queryValue}
					onChange={onChange}
					height="240px"
					options={{
						fontSize: 13,
						wordWrap: 'on',
						lineNumbers: 'off',
						glyphMargin: false,
						folding: false,
						lineDecorationsWidth: 0,
						lineNumbersMinChars: 0,
						minimap: { enabled: false },
					}}
				/>
				{onTestRun ? (
					<Button
						type="primary"
						size="small"
						onClick={onTestRun}
						style={{ position: 'absolute', bottom: 0 }}
						loading={testRunLoading}
					>
						Test Run Query
					</Button>
				) : null}
				{error ? (
					<div>
						<Typography.Text color="warning">{error}</Typography.Text>
					</div>
				) : null}
			</div>
		</div>
	);
}

export default QueryFields;
