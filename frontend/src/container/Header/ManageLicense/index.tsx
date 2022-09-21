import { Typography } from 'antd';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import useFeatureFlags from 'hooks/useFeatureFlag';
import history from 'lib/history';
import React from 'react';

import {
	FreePlanIcon,
	ManageLicenseContainer,
	ManageLicenseWrapper,
} from './styles';

function ManageLicense({ onToggle }: ManageLicenseProps): JSX.Element {
	const isEnterprise = useFeatureFlags(FeatureKeys.ENTERPRISE_PLAN);
	console.log('isEnterprise', isEnterprise);
	return (
		<>
			<Typography>SIGNOZ STATUS</Typography>

			<ManageLicenseContainer>
				<ManageLicenseWrapper>
					<FreePlanIcon />
					<Typography>{!isEnterprise ? 'Free Plan' : 'Enterprise Plan'} </Typography>
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
