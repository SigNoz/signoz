import { Button, Col, Row, Space } from 'antd';
import TimePreference from 'components/TimePreferenceDropDown';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useState } from 'react';

import SearchResult from './SearchResult';
import SelectKeys from './SelectKeys';
import { IngestionAnalyticsContainer } from './styles';

function IngestionAnalytics(): JSX.Element {
	const [currentTimeframe, setCurrentTimeframe] = useState<timePreferance>({
		name: 'Last 5 min',
		enum: 'LAST_5_MIN',
	});
	const [averageTimeframe, setAverageTimeframe] = useState<timePreferance>({
		name: 'Last 5 min',
		enum: 'LAST_5_MIN',
	});

	const renderGroupBy = (): JSX.Element => {
		return (
			<Row align="middle" style={{ marginBottom: '1rem' }}>
				<Col span={2}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<span>Group by</span>{' '}
					</div>
				</Col>
				<Col>
					<SelectKeys />
				</Col>
			</Row>
		);
	};

	const renderPeriods = (): JSX.Element => {
		return (
			<Row align="middle" style={{ marginBottom: '1rem' }}>
				<Col span={4}>
					<Row align="middle">
						<span style={{ marginRight: '1rem' }}> Current Period </span>
						<TimePreference
							selectedTime={currentTimeframe}
							setSelectedTime={setCurrentTimeframe}
						/>
					</Row>
				</Col>
				<Col>
					<Row align="middle">
						<span style={{ marginLeft: '2rem', marginRight: '1rem' }}>
							Average Period{' '}
						</span>
						<TimePreference
							selectedTime={averageTimeframe}
							setSelectedTime={setAverageTimeframe}
						/>
					</Row>
				</Col>
				<Col>
					<div style={{ marginLeft: '2rem' }}>
						<Button type="primary"> Go </Button>
					</div>
				</Col>
			</Row>
		);
	};
	return (
		<IngestionAnalyticsContainer>
			{renderGroupBy()}
			<Space size={3} direction="vertical" />
			{renderPeriods()}
			<Space direction="vertical" size={10} style={{ width: '100%' }}>
				<SearchResult />
			</Space>
		</IngestionAnalyticsContainer>
	);
}

export default IngestionAnalytics;
