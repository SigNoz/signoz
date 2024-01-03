import './Toolbar.styles.scss';

import { Button, Select, Switch, Typography } from 'antd';
import { Atom, MousePointerSquare, Play, Terminal } from 'lucide-react';

interface ToolbarProps {
	selectedView: string;
	showHistogram: boolean;
	onToggleHistrogramVisibility: () => void;
}

export default function Toolbar({
	selectedView,
	showHistogram,
	onToggleHistrogramVisibility,
}: ToolbarProps): JSX.Element {
	const onChange = (value: string): void => {
		console.log(`selected ${value}`);
	};

	const onSearch = (value: string): void => {
		console.log('search:', value);
	};

	console.log(selectedView, showHistogram);

	// Filter `option.label` match the user type `input`
	const filterOption = (
		input: string,
		option?: { label: string; value: string },
	): any => (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

	return (
		<div className="toolbar">
			<div className="left-options">
				<div className="query-builder-view-options">
					<div
						className="views-tabs"
						// onChange={handleModeChange}
					>
						<Button
							value="search"
							// eslint-disable-next-line sonarjs/no-duplicate-string
							className={selectedView === 'search' ? 'active-tab' : ''}
						>
							<MousePointerSquare size={14} />
						</Button>
						<Button
							value="query-builder"
							className={selectedView === 'query-builder' ? 'active-tab' : ''}
						>
							<Atom size={14} />
						</Button>
						<Button
							value="clickhouse"
							className={selectedView === 'clickhouse' ? 'active-tab' : ''}
						>
							<Terminal size={14} />
						</Button>
					</div>
				</div>

				<div className="histogram-view-controller">
					<Typography>Histogram</Typography>
					<Switch
						size="small"
						defaultChecked
						onChange={onToggleHistrogramVisibility}
					/>
				</div>
			</div>

			<div className="right-options">
				<div className="date-picker-container">
					<div className="refresh-time">Refreshed 10 min ago</div>

					<Select
						showSearch
						style={{
							width: '160px',
						}}
						placeholder="Live"
						optionFilterProp="children"
						onChange={onChange}
						onSearch={onSearch}
						filterOption={filterOption}
						options={[
							{
								value: 'jack',
								label: 'Jack',
							},
							{
								value: 'lucy',
								label: 'Lucy',
							},
							{
								value: 'tom',
								label: 'Tom',
							},
						]}
					/>
				</div>

				<div className="stage-run-query-container">
					<Button type="primary" icon={<Play size={14} />}>
						Stage & Run Query
					</Button>
				</div>
			</div>
		</div>
	);
}
