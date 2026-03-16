import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Select, Switch, Typography } from 'antd';
import TimePreference from 'components/TimePreferenceDropDown';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	ItemsProps,
	PanelTypesWithData,
} from 'container/DashboardContainer/PanelTypeSelectionModal/menuItems';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { LayoutDashboard } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';

import SettingsSection from '../../components/SettingsSection/SettingsSection';
import { timePreferance } from '../../timeItems';

const { Option } = Select;

interface VisualizationSettingsSectionProps {
	selectedGraph: PANEL_TYPES;
	setGraphHandler: (type: PANEL_TYPES) => void;
	selectedTime: timePreferance;
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	stackedBarChart: boolean;
	setStackedBarChart: Dispatch<SetStateAction<boolean>>;
	isFillSpans: boolean;
	setIsFillSpans: Dispatch<SetStateAction<boolean>>;
	allowPanelTimePreference: boolean;
	allowStackingBarChart: boolean;
	allowFillSpans: boolean;
}

export default function VisualizationSettingsSection({
	selectedGraph,
	setGraphHandler,
	selectedTime,
	setSelectedTime,
	stackedBarChart,
	setStackedBarChart,
	isFillSpans,
	setIsFillSpans,
	allowPanelTimePreference,
	allowStackingBarChart,
	allowFillSpans,
}: VisualizationSettingsSectionProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const [graphTypes, setGraphTypes] = useState<ItemsProps[]>(PanelTypesWithData);

	useEffect(() => {
		const queryContainsMetricsDataSource = currentQuery.builder.queryData.some(
			(query) => query.dataSource === DataSource.METRICS,
		);

		if (queryContainsMetricsDataSource) {
			setGraphTypes((prev) =>
				prev.filter((graph) => graph.name !== PANEL_TYPES.LIST),
			);
		} else {
			setGraphTypes(PanelTypesWithData);
		}
	}, [currentQuery]);

	return (
		<SettingsSection
			title="Visualization"
			defaultOpen
			icon={<LayoutDashboard size={14} />}
		>
			<section className="panel-type control-container">
				<Typography.Text className="section-heading">Panel Type</Typography.Text>
				<Select
					onChange={setGraphHandler}
					value={selectedGraph}
					className="panel-type-select"
					data-testid="panel-change-select"
					data-stacking-state={stackedBarChart ? 'true' : 'false'}
				>
					{graphTypes.map((item) => (
						<Option key={item.name} value={item.name}>
							<div className="select-option">
								<div className="icon">{item.icon}</div>
								<Typography.Text className="display">{item.display}</Typography.Text>
							</div>
						</Option>
					))}
				</Select>
			</section>

			{allowPanelTimePreference && (
				<section className="panel-time-preference control-container">
					<Typography.Text className="section-heading">
						Panel Time Preference
					</Typography.Text>
					<TimePreference
						{...{
							selectedTime,
							setSelectedTime,
						}}
					/>
				</section>
			)}

			{allowStackingBarChart && (
				<section className="stack-chart control-container">
					<Typography.Text className="section-heading">Stack series</Typography.Text>
					<Switch
						checked={stackedBarChart}
						size="small"
						onChange={(checked): void => setStackedBarChart(checked)}
					/>
				</section>
			)}

			{allowFillSpans && (
				<section className="fill-gaps toggle-card">
					<div className="toggle-card-text-container">
						<Typography className="section-heading">Fill gaps</Typography>
						<Typography.Text className="toggle-card-description">
							Fill gaps in data with 0 for continuity
						</Typography.Text>
					</div>
					<Switch
						checked={isFillSpans}
						size="small"
						onChange={(checked): void => setIsFillSpans(checked)}
					/>
				</section>
			)}
		</SettingsSection>
	);
}
