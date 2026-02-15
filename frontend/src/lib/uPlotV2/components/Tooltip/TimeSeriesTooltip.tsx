import { TimeSeriesTooltipProps } from '../types';
import Tooltip from './Tooltip';

export default function TimeSeriesTooltip(
	props: TimeSeriesTooltipProps,
): JSX.Element {
	return <Tooltip {...props} />;
}
