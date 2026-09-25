import StripTypography from 'container/BottomStrip/components/StripTypography/StripTypography';
import { pluralize } from 'utils/pluralize';

interface StripInfoProps {
	filteredCount: number;
	totalCount: number;
}

function StripInfo({ filteredCount, totalCount }: StripInfoProps): JSX.Element {
	return (
		<StripTypography>
			{filteredCount} of {pluralize(totalCount, 'rule')}
		</StripTypography>
	);
}

export default StripInfo;
