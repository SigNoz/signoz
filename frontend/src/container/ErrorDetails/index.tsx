import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Row, Space, Table, Typography } from 'antd';
import Editor from 'components/Editor';
import React, { useRef } from 'react';

import { DashedContainer, EventContainer } from './styles';

function ErrorDetails(): JSX.Element {
	const stackTraceValue = useRef('Exception Error');

	const columns = [
		{
			title: 'Key',
			dataIndex: 'key',
			key: 'key',
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
		},
	];

	const data = [
		{
			key: 'John Brown',
			value: 32,
		},
		{
			key: 'Jim Green',
			value: 42,
		},
		{
			key: 'Joe Black',
			value: 32,
		},
	];
	return (
		<>
			<Typography>werkzeug.exceptions:HTTPException</Typography>
			<Typography>??? Unknown Error: None</Typography>
			<Divider />

			<EventContainer>
				<div>
					<Typography>Event `c220b2575cb029831283ajfsdh0d`</Typography>
					<Typography>Dec 07 2021 12:59:44 PM </Typography>
				</div>
				<div>
					<Space align="end" direction="horizontal">
						<Button icon={<LeftOutlined />} />
						<Button>Older</Button>
						<Button>Newer</Button>
						<Button icon={<RightOutlined />} />
					</Space>
				</div>
			</EventContainer>

			<DashedContainer>
				<Typography>
					See what happened before and after this error in a trace graph
				</Typography>
				<Button type="primary">See the error in trace graph</Button>
			</DashedContainer>

			<Typography.Title level={4}>Stacktrace</Typography.Title>
			<Editor value={stackTraceValue} readOnly />

			<Space direction="vertical">
				<Table tableLayout="fixed" columns={columns} dataSource={data} />
			</Space>
		</>
	);
}

export default ErrorDetails;
