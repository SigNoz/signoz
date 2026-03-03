import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { DialogWrapper } from '@signozhq/dialog';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Flex, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { ArrowRight, Cable, Check } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { routePermission } from 'utils/permission';

import './IntegrationsHeader.styles.scss';

interface IntegrationsHeaderProps {
	searchQuery: string;
	onSearchChange: (value: string) => void;
}

function IntegrationsHeader(props: IntegrationsHeaderProps): JSX.Element {
	const history = useHistory();
	const { user } = useAppContext();

	const { searchQuery, onSearchChange } = props;
	const [
		isRequestIntegrationDialogOpen,
		setIsRequestIntegrationDialogOpen,
	] = useState(false);

	const [
		isSubmittingRequestForIntegration,
		setIsSubmittingRequestForIntegration,
	] = useState(false);

	const [requestedIntegrationName, setRequestedIntegrationName] = useState('');

	const isGetStartedWithCloudAllowed = routePermission.GET_STARTED_WITH_CLOUD.includes(
		user.role,
	);

	const handleRequestIntegrationSubmit = async (): Promise<void> => {
		try {
			setIsSubmittingRequestForIntegration(true);
			const eventName = 'Integration requested';
			const screenName = 'Integration list page';

			const response = await logEvent(eventName, {
				screen: screenName,
				integration: requestedIntegrationName,
			});

			if (response.statusCode === 200) {
				toast.success('Integration Request Submitted', {
					position: 'top-right',
				});
				setRequestedIntegrationName('');
				setIsRequestIntegrationDialogOpen(false);
				setIsSubmittingRequestForIntegration(false);
			} else {
				toast.error(response.error || 'Something went wrong', {
					position: 'top-right',
				});

				setIsSubmittingRequestForIntegration(false);
			}
		} catch (error) {
			toast.error('Something went wrong', {
				position: 'top-right',
			});
			setIsSubmittingRequestForIntegration(false);
		}
	};

	return (
		<div className="integrations-header">
			<Typography.Title className="title">Integrations</Typography.Title>
			<Flex
				justify="space-between"
				align="center"
				className="integrations-header__subrow"
			>
				<Typography.Text className="subtitle">
					Manage integrations for this workspace.
				</Typography.Text>
			</Flex>

			<div className="integrations-search-request-container">
				<Input
					placeholder="Search for an integration..."
					value={searchQuery}
					onChange={(e): void => onSearchChange(e.target.value)}
				/>
				<Button
					variant="solid"
					color="secondary"
					className="request-integration-btn"
					prefixIcon={<Cable size={14} />}
					size="sm"
					onClick={(): void => setIsRequestIntegrationDialogOpen(true)}
				>
					Request Integration
				</Button>

				<DialogWrapper
					className="request-integration-dialog"
					title="Request New Integration"
					open={isRequestIntegrationDialogOpen}
					onOpenChange={setIsRequestIntegrationDialogOpen}
				>
					<div className="request-integration-form">
						<div className="request-integration-form-title">
							Which integration are you looking for?
						</div>
						<Input
							placeholder="Enter integration name..."
							value={requestedIntegrationName}
							onChange={(e): void => {
								setRequestedIntegrationName(e.target.value);
							}}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' && requestedIntegrationName?.trim().length > 0) {
									handleRequestIntegrationSubmit();
								}
							}}
							disabled={isSubmittingRequestForIntegration}
						/>
					</div>

					<div className="request-integration-form-footer">
						<Button
							variant="solid"
							color="primary"
							size="sm"
							prefixIcon={<Check size={14} />}
							onClick={handleRequestIntegrationSubmit}
							loading={isSubmittingRequestForIntegration}
							disabled={
								isSubmittingRequestForIntegration ||
								!requestedIntegrationName ||
								requestedIntegrationName?.trim().length === 0
							}
						>
							Submit
						</Button>
					</div>
				</DialogWrapper>

				{isGetStartedWithCloudAllowed && (
					<Button
						variant="solid"
						color="secondary"
						className="view-data-sources-btn"
						onClick={(): void => history.push(ROUTES.GET_STARTED_WITH_CLOUD)}
					>
						<span>View 150+ Data Sources</span>
						<ArrowRight size={14} />
					</Button>
				)}
			</div>
		</div>
	);
}

export default IntegrationsHeader;
