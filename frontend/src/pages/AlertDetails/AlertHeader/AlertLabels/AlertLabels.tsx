import './alertLabels.styles.scss';

import KeyValueLabel from 'periscope/components/KeyValueLabel/KeyValueLabel';
import SeeMore from 'periscope/components/SeeMore/SeeMore';

type AlertLabelsProps = { labels: Record<string, string> };

function AlertLabels({ labels }: AlertLabelsProps): JSX.Element {
	return (
		<div className="alert-labels">
			<SeeMore initialCount={2} moreLabel="More">
				{Object.entries(labels).map(([key, value]) => (
					<KeyValueLabel key={`label-${key}`} badgeKey={key} badgeValue={value} />
				))}
			</SeeMore>
		</div>
	);
}

export default AlertLabels;
