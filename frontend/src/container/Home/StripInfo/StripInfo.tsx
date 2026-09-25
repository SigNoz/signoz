import { useGetAlerts } from 'api/generated/services/alerts';
import StripTypography from 'container/BottomStrip/components/StripTypography/StripTypography';
import { pluralize } from 'utils/pluralize';

function StripInfo(): JSX.Element {
	// Firing instances, not rules, matching the triggered alerts page. Home's own
	// rules query sets `cacheTime: 0`, so it cannot be shared.
	const { data } = useGetAlerts();

	const count = data?.data?.length ?? 0;

	return <StripTypography>{pluralize(count, 'alert')} firing</StripTypography>;
}

export default StripInfo;
