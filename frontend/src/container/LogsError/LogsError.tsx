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

				<div className="contact-support" onClick={handleContactSupport}>
					<Typography.Link
						/* TODO(typography): a link with no href renders plain text: a click that does not navigate is a Button with variant="link" */ variant="paragraph"
						size="base"
						weight="medium"
						textOverflow="wrap"
					>
						Contact Support{' '}
					</Typography.Link>

					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
