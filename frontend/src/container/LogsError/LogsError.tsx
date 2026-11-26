import { Typography } from '@signozhq/ui/typography';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { navigate } from 'lib/router/navigation';
import { ArrowRight } from '@signozhq/icons';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import './LogsError.styles.scss';

export default function LogsError(): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleContactSupport = (): void => {
		if (isCloudUserVal) {
			navigate('/support');
		} else {
			window.open('https://signoz.io/slack', '_blank');
		}
	};

	return (
		<div className="logs-error-container">
			<div className="logs-error-content">
				<img src={awwSnapUrl} alt="error-emoji" className="error-state-svg" />
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					<span className="aww-snap">Aw snap :/ </span> Something went wrong. Please
					try again or contact support.
				</Typography>

				<Typography.Link
					variant="paragraph"
					size="base"
					weight="medium"
					display="inline-flex"
					gap={4}
					marginTop={8}
					textOverflow="wrap"
					onClick={handleContactSupport}
					testId="logs-error-contact-support"
				>
					Contact Support
					<ArrowRight size={14} />
				</Typography.Link>
			</div>
		</div>
	);
}
