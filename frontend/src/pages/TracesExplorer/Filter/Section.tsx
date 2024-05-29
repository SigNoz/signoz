import './Filter.styles.scss';

import { Collapse, Divider } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { DurationSection } from './DurationSection';
import { AllTraceFilterKeys, AllTraceFilterKeyValue } from './filterUtils';
import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: AllTraceFilterKeys;
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>;
}
export function Section(props: SectionProps): JSX.Element {
	const { panelName, setSelectedFilters } = props;

	return (
		<div>
			<Divider plain className="divider" />
			<Collapse
				bordered={false}
				className="collapseContainer"
				items={[
					panelName === 'durationNano'
						? {
								key: panelName,
								children: <DurationSection setSelectedFilters={setSelectedFilters} />,
								label: AllTraceFilterKeyValue[panelName],
						  }
						: {
								key: panelName,
								children: (
									<SectionBody
										type={panelName}
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
