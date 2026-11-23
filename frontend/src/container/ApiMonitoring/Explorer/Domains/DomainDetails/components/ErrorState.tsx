import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { RotateCw } from '@signozhq/icons';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

function ErrorState({ refetch }: { refetch: () => void }): JSX.Element {
	return (
		<div className="error-state-container">
			<div className="error-state-content-wrapper">
				<div className="error-state-content">
					<div className="icon">
						<img src={awwSnapUrl} alt="awwSnap" width={32} height={32} />
					</div>
					<div className="error-state-text">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Uh-oh :/ We ran into an error.
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							Please refresh this panel.
						</Typography>
					</div>
				</div>
				<Button
					className="refresh-cta"
					onClick={(): void => refetch()}
					icon={<RotateCw size={16} />}
				>
					Refresh this panel
				</Button>
			</div>
		</div>
	);
}

export default ErrorState;
