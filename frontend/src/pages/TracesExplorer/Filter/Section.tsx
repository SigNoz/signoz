import './Filter.styles.scss';

import { Collapse, Divider } from 'antd';
import { TraceFilterEnum } from 'types/reducer/trace';

import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: TraceFilterEnum;
}
export function Section(props: SectionProps): JSX.Element {
	const { panelName } = props;

	return (
		<div>
			<Divider plain className="divider" />
			<Collapse
				bordered={false}
				className="collapseContainer"
				items={[
					{
						key: panelName,
						children: <SectionBody type={panelName} />,
						label: panelName,
					},
				]}
			/>
		</div>
	);
}
