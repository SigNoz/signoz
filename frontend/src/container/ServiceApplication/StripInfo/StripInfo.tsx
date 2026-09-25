import StripTypography from 'container/BottomStrip/components/StripTypography/StripTypography';
import { pluralize } from 'utils/pluralize';

interface StripInfoProps {
	count: number;
}

function StripInfo({ count }: StripInfoProps): JSX.Element {
	return <StripTypography>{pluralize(count, 'service')}</StripTypography>;
}

export default StripInfo;
