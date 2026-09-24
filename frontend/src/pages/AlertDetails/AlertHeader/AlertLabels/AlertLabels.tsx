import KeyValueLabel from 'periscope/components/KeyValueLabel';
import SeeMore from 'periscope/components/SeeMore';

import './AlertLabels.styles.scss';

export type AlertLabelsProps = {
	labels: Record<string, any>;
	initialCount?: number;
	testId?: string;
};

function AlertLabels({
	labels,
	initialCount = 2,
	testId,
}: AlertLabelsProps): JSX.Element {
	return (
		<div className="alert-labels" data-testid={testId}>
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
	testId: undefined,
};

export default AlertLabels;
