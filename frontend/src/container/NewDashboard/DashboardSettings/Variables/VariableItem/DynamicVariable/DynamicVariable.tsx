import './DynamicVariable.styles.scss';

import { Input, Select, Typography } from 'antd';

enum AttributeSource {
	ALL_SOURCES = 'All Sources',
	LOGS = 'Logs',
	METRICS = 'Metrics',
	TRACES = 'Traces',
}

function DynamicVariable(): JSX.Element {
	const sources = [
		AttributeSource.ALL_SOURCES,
		AttributeSource.LOGS,
		AttributeSource.TRACES,
		AttributeSource.METRICS,
	];

	return (
		<div className="dynamic-variable-container">
			<Input placeholder="Enter an Attribute" />
			<Typography className="dynamic-variable-from-text">from</Typography>
			<Select
				placeholder="Source"
				defaultValue={AttributeSource.ALL_SOURCES}
				options={sources.map((source) => ({ label: source, value: source }))}
			/>
		</div>
	);
}

export default DynamicVariable;
