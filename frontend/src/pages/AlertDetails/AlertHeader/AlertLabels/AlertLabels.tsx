import './AlertLabels.styles.scss';

import KeyValueLabel from 'periscope/components/KeyValueLabel';
import SeeMore from 'periscope/components/SeeMore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AlertLabelsProps = {
	labels: Record<string, any>;
	initialCount?: number;
};

function AlertLabels({
	labels,
	initialCount = 2,
}: AlertLabelsProps): JSX.Element {
	return (
		<div className="alert-labels">
			<SeeMore initialCount={initialCount} moreLabel="More">
				{Object.entries(labels).map(([key, value]) => (
					<KeyValueLabel key={`label-${key}`} badgeKey={key} badgeValue={value} />
				))}
			</SeeMore>
		</div>
	);
}

AlertLabels.defaultProps = {
	initialCount: 2,
};

export default AlertLabels;
