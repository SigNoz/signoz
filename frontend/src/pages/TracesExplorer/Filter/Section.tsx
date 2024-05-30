import './Filter.styles.scss';

import { Collapse, Divider } from 'antd';
import { Dispatch, SetStateAction } from 'react';

import { DurationSection } from './DurationSection';
import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
	FilterType,
} from './filterUtils';
import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: AllTraceFilterKeys;
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
}
export function Section(props: SectionProps): JSX.Element {
	const { panelName, setSelectedFilters, selectedFilters } = props;

	return (
		<div>
			<Divider plain className="divider" />
			<Collapse
				bordered={false}
				className="collapseContainer"
				defaultActiveKey={
					['status', 'durationNano', 'serviceName'].includes(panelName)
						? panelName
						: undefined
				}
				items={[
					panelName === 'durationNano'
						? {
								key: panelName,
								children: (
									<DurationSection
										setSelectedFilters={setSelectedFilters}
										selectedFilters={selectedFilters}
									/>
								),
								label: AllTraceFilterKeyValue[panelName],
						  }
						: {
								key: panelName,
								children: (
									<SectionBody
										type={panelName}
										selectedFilters={selectedFilters}
										setSelectedFilters={setSelectedFilters}
									/>
								),
								label: AllTraceFilterKeyValue[panelName],
						  },
				]}
			/>
		</div>
	);
}
