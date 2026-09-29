import { ChartNoAxesGantt, TriangleAlert } from '@signozhq/icons';
import StripKeyValue from 'container/BottomStrip/components/StripKeyValue/StripKeyValue';

interface StripInfoProps {
	totalSpansCount: number;
	totalErrorSpansCount: number;
}

function StripInfo({
	totalSpansCount,
	totalErrorSpansCount,
}: StripInfoProps): JSX.Element {
	return (
		<>
			<StripKeyValue
				prefix={<ChartNoAxesGantt size={13} />}
				label="Spans"
				value={totalSpansCount}
			/>
			<StripKeyValue
				prefix={<TriangleAlert size={13} />}
				label="Errors"
				value={totalErrorSpansCount}
				tone={totalErrorSpansCount > 0 ? 'error' : 'default'}
			/>
		</>
	);
}

export default StripInfo;
