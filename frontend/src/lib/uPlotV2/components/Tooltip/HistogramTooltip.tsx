import { HistogramTooltipProps } from '../types';
import Tooltip from './Tooltip';

export default function HistogramTooltip(
	props: HistogramTooltipProps,
): JSX.Element {
	return <Tooltip {...props} showTooltipHeader={false} />;
}
