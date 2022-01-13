import React from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';
import { Card } from 'antd';

import Duration from './Duration';
import CommonCheckBox from './CommonCheckBox';

const PanelBody = (props: PanelBodyProps): JSX.Element => {
	const { type } = props;

	return (
		<Card bordered={false}>
			{type === 'duration' && <Duration />}
			{type === 'status' && <CommonCheckBox name={type} />}
			{type === 'component' && <CommonCheckBox name={type} />}
			{type === 'httpCode' && <CommonCheckBox name={type} />}
			{type === 'httpHost' && <CommonCheckBox name={type} />}
			{type === 'httpMethod' && <CommonCheckBox name={type} />}
			{type === 'httpRoute' && <CommonCheckBox name={type} />}
			{type === 'httpUrl' && <CommonCheckBox name={type} />}
			{type === 'serviceName' && <CommonCheckBox name={type} />}
			{type === 'operation' && <CommonCheckBox name={type} />}
		</Card>
	);
};

interface PanelBodyProps {
	type: TraceFilterEnum;
}

export default PanelBody;
