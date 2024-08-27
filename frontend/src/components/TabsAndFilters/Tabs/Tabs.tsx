import './Tabs.styles.scss';

import { Radio } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { History, Table } from 'lucide-react';
import { useState } from 'react';

import { ALERT_TABS } from '../constants';

export function Tabs(): JSX.Element {
	const [selectedTab, setSelectedTab] = useState('overview');

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedTab(e.target.value);
	};

	return (
		<Radio.Group className="tabs" onChange={handleTabChange} value={selectedTab}>
			<Radio.Button
				className={
					selectedTab === ALERT_TABS.OVERVIEW ? 'selected_view tab' : 'tab'
				}
				value={ALERT_TABS.OVERVIEW}
			>
				<div className="tab-title">
					<Table size={14} />
					Overview
				</div>
			</Radio.Button>
			<Radio.Button
				className={selectedTab === ALERT_TABS.HISTORY ? 'selected_view tab' : 'tab'}
				value={ALERT_TABS.HISTORY}
			>
				<div className="tab-title">
					<History size={14} />
					History
				</div>
			</Radio.Button>
		</Radio.Group>
	);
}
