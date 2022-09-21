import { Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';

import {
	FreePlanIcon,
	ManageLicenseContainer,
	ManageLicenseWrapper,
} from './styles';

function ManageLicense({ onToggle }: ManageLicenseProps): JSX.Element {
	return (
		<>
			<Typography>SIGNOZ STATUS</Typography>

			<ManageLicenseContainer>
				<ManageLicenseWrapper>
					<FreePlanIcon />
					<Typography>Free Plan</Typography>
				</ManageLicenseWrapper>

				<Typography.Link
					onClick={(): void => {
						console.log('in licenses');
						onToggle();
						history.push(ROUTES.LIST_LICENSES);
					}}
				>
					Manage Licenses
				</Typography.Link>
			</ManageLicenseContainer>
		</>
	);
}

interface ManageLicenseProps {
	onToggle: VoidFunction;
}

export default ManageLicense;
