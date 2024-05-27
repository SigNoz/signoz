import './Filter.styles.scss';

import { Collapse, Divider } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';

import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: TraceFilterEnum;
	setSelectedFilters: Dispatch<
		SetStateAction<Record<TraceFilterEnum, string[]> | undefined>
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
					{
						key: panelName,
						children: (
							<SectionBody type={panelName} setSelectedFilters={setSelectedFilters} />
						),
						label: panelName,
					},
				]}
			/>
		</div>
	);
}
