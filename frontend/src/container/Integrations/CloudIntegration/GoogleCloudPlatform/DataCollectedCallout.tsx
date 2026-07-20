import { Callout } from '@signozhq/ui/callout';

// TODO(gcp): confirm final warning copy against the design artifact.
function DataCollectedCallout(): JSX.Element {
	return (
		<div
			className="gcp-data-collected-callout"
			data-testid="gcp-data-collected-callout"
		>
			<Callout
				type="warning"
				title="The metrics below are suggested values for your OTel collector configuration and may vary based on the metrics defined in your collector config."
			/>
		</div>
	);
}

export default DataCollectedCallout;
