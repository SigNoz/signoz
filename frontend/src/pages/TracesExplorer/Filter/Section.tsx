import './Filter.styles.scss';

import { Button, Collapse, Divider } from 'antd';
import { Dispatch, MouseEvent, SetStateAction } from 'react';

import { DurationSection } from './DurationSection';
import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
	FilterType,
	HandleRunProps,
} from './filterUtils';
import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: AllTraceFilterKeys;
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
	handleRun: (props?: HandleRunProps) => void;
}
export function Section(props: SectionProps): JSX.Element {
	const { panelName, setSelectedFilters, selectedFilters, handleRun } = props;

	const onClearHandler = (e: MouseEvent): void => {
		e.stopPropagation();
		e.preventDefault();

		if (
			selectedFilters?.[panelName] ||
			selectedFilters?.durationNanoMin ||
			selectedFilters?.durationNanoMax
		) {
			handleRun({ clearByType: panelName });
		}
	};

	return (
		<div>
			<Divider plain className="divider" />
			<div className="section-body-header">
				<Collapse
					bordered={false}
					className="collapseContainer"
					defaultActiveKey={
						['hasError', 'durationNano', 'serviceName'].includes(panelName)
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
											handleRun={handleRun}
										/>
									),
									label: AllTraceFilterKeyValue[panelName],
							  },
					]}
				/>
				<Button type="link" onClick={onClearHandler}>
					Clear All
				</Button>
			</div>
		</div>
	);
}
