import './OnboardingQuestionaire.styles.scss';

import { NotificationInstance } from 'antd/es/notification/interface';
import logEvent from 'api/common/logEvent';
import updateProfileAPI from 'api/onboarding/updateProfile';
import getAllOrgPreferences from 'api/preferences/getAllOrgPreferences';
import updateOrgPreferenceAPI from 'api/preferences/updateOrgPreference';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { InviteTeamMembersProps } from 'container/OrganizationSettings/PendingInvitesContainer';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';

import {
	AboutSigNozQuestions,
	SignozDetails,
} from './AboutSigNozQuestions/AboutSigNozQuestions';
import InviteTeamMembers from './InviteTeamMembers/InviteTeamMembers';
import { OnboardingHeader } from './OnboardingHeader/OnboardingHeader';
import OptimiseSignozNeeds, {
	OptimiseSignozDetails,
} from './OptimiseSignozNeeds/OptimiseSignozNeeds';
import OrgQuestions, { OrgData, OrgDetails } from './OrgQuestions/OrgQuestions';

export const showErrorNotification = (
	notifications: NotificationInstance,
	err: Error,
): void => {
	notifications.error({
		message: err.message || SOMETHING_WENT_WRONG,
	});
};

const INITIAL_ORG_DETAILS: OrgDetails = {
	organisationName: '',
	usesObservability: true,
	observabilityTool: '',
	otherTool: '',
	familiarity: '',
};

const INITIAL_SIGNOZ_DETAILS: SignozDetails = {
	hearAboutSignoz: '',
	interestInSignoz: '',
	otherInterestInSignoz: '',
	otherAboutSignoz: '',
};

const INITIAL_OPTIMISE_SIGNOZ_DETAILS: OptimiseSignozDetails = {
	logsPerDay: 0,
	hostsPerDay: 0,
	services: 0,
};

const BACK_BUTTON_EVENT_NAME = 'Org Onboarding: Back Button Clicked';
const NEXT_BUTTON_EVENT_NAME = 'Org Onboarding: Next Button Clicked';
const ONBOARDING_COMPLETE_EVENT_NAME = 'Org Onboarding: Complete';

function OnboardingQuestionaire(): JSX.Element {
	const { notifications } = useNotifications();
	const { org, updateOrgPreferences } = useAppContext();
	const [currentStep, setCurrentStep] = useState<number>(1);
	const [orgDetails, setOrgDetails] = useState<OrgDetails>(INITIAL_ORG_DETAILS);
	const [signozDetails, setSignozDetails] = useState<SignozDetails>(
		INITIAL_SIGNOZ_DETAILS,
	);

	const [
		optimiseSignozDetails,
		setOptimiseSignozDetails,
	] = useState<OptimiseSignozDetails>(INITIAL_OPTIMISE_SIGNOZ_DETAILS);
	const [teamMembers, setTeamMembers] = useState<
		InviteTeamMembersProps[] | null
	>(null);

	const [currentOrgData, setCurrentOrgData] = useState<OrgData | null>(null);

	const [
		updatingOrgOnboardingStatus,
		setUpdatingOrgOnboardingStatus,
	] = useState<boolean>(false);

	useEffect(() => {
		if (org) {
			setCurrentOrgData(org[0]);

			setOrgDetails({
				...orgDetails,
				organisationName: org[0].name,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [org]);

	useEffect(() => {
		logEvent('Org Onboarding: Started', {
			org_id: org?.[0]?.id,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const { refetch: refetchOrgPreferences } = useQuery({
		queryFn: () => getAllOrgPreferences(),
		queryKey: ['getOrgPreferences'],
		enabled: false,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (response.payload && response.payload.data) {
				updateOrgPreferences(response.payload.data);
			}

			setUpdatingOrgOnboardingStatus(false);

			logEvent('Org Onboarding: Redirecting to Get Started', {});

			history.push(ROUTES.GET_STARTED);
		},
		onError: () => {
			setUpdatingOrgOnboardingStatus(false);
		},
	});

	const isNextDisabled =
		optimiseSignozDetails.logsPerDay === 0 &&
		optimiseSignozDetails.hostsPerDay === 0 &&
		optimiseSignozDetails.services === 0;

	const { mutate: updateProfile, isLoading: isUpdatingProfile } = useMutation(
		updateProfileAPI,
		{
			onSuccess: () => {
				setCurrentStep(4);
			},
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

	const { mutate: updateOrgPreference } = useMutation(updateOrgPreferenceAPI, {
		onSuccess: () => {
			refetchOrgPreferences();
		},
		onError: (error) => {
			showErrorNotification(notifications, error as AxiosError);

			setUpdatingOrgOnboardingStatus(false);
		},
	});

	const handleUpdateProfile = (): void => {
		logEvent(NEXT_BUTTON_EVENT_NAME, {
			currentPageID: 3,
			nextPageID: 4,
		});

		updateProfile({
			familiarity_with_observability: orgDetails?.familiarity as string,
			has_existing_observability_tool: orgDetails?.usesObservability as boolean,
			existing_observability_tool:
				orgDetails?.observabilityTool === 'Others'
					? (orgDetails?.otherTool as string)
					: (orgDetails?.observabilityTool as string),

			reasons_for_interest_in_signoz:
				signozDetails?.interestInSignoz === 'Others'
					? (signozDetails?.otherInterestInSignoz as string)
					: (signozDetails?.interestInSignoz as string),
			where_did_you_hear_about_signoz:
				signozDetails?.hearAboutSignoz === 'Others'
					? (signozDetails?.otherAboutSignoz as string)
					: (signozDetails?.hearAboutSignoz as string),

			logs_scale_per_day_in_gb: optimiseSignozDetails?.logsPerDay as number,
			number_of_hosts: optimiseSignozDetails?.hostsPerDay as number,
			number_of_services: optimiseSignozDetails?.services as number,
		});
	};

	const handleOnboardingComplete = (): void => {
		logEvent(ONBOARDING_COMPLETE_EVENT_NAME, {
			currentPageID: 4,
		});

		setUpdatingOrgOnboardingStatus(true);
		updateOrgPreference({
			preferenceID: 'ORG_ONBOARDING',
			value: true,
		});
	};

	return (
		<div className="onboarding-questionaire-container">
			<div className="onboarding-questionaire-header">
				<OnboardingHeader />
			</div>

			<div className="onboarding-questionaire-content">
				{currentStep === 1 && (
					<OrgQuestions
						currentOrgData={currentOrgData}
						orgDetails={orgDetails}
						onNext={(orgDetails: OrgDetails): void => {
							logEvent(NEXT_BUTTON_EVENT_NAME, {
								currentPageID: 1,
								nextPageID: 2,
							});

							setOrgDetails(orgDetails);
							setCurrentStep(2);
						}}
					/>
				)}

				{currentStep === 2 && (
					<AboutSigNozQuestions
						signozDetails={signozDetails}
						setSignozDetails={setSignozDetails}
						onBack={(): void => {
							logEvent(BACK_BUTTON_EVENT_NAME, {
								currentPageID: 2,
								prevPageID: 1,
							});
							setCurrentStep(1);
						}}
						onNext={(): void => {
							logEvent(NEXT_BUTTON_EVENT_NAME, {
								currentPageID: 2,
								nextPageID: 3,
							});
							setCurrentStep(3);
						}}
					/>
				)}

				{currentStep === 3 && (
					<OptimiseSignozNeeds
						isNextDisabled={isNextDisabled}
						isUpdatingProfile={isUpdatingProfile}
						optimiseSignozDetails={optimiseSignozDetails}
						setOptimiseSignozDetails={setOptimiseSignozDetails}
						onBack={(): void => {
							logEvent(BACK_BUTTON_EVENT_NAME, {
								currentPageID: 3,
								prevPageID: 2,
							});
							setCurrentStep(2);
						}}
						onNext={handleUpdateProfile}
						onWillDoLater={(): void => setCurrentStep(4)}
					/>
				)}

				{currentStep === 4 && (
					<InviteTeamMembers
						isLoading={updatingOrgOnboardingStatus}
						teamMembers={teamMembers}
						setTeamMembers={setTeamMembers}
						onBack={(): void => {
							logEvent(BACK_BUTTON_EVENT_NAME, {
								currentPageID: 4,
								prevPageID: 3,
							});
							setCurrentStep(3);
						}}
						onNext={handleOnboardingComplete}
					/>
				)}
			</div>
		</div>
	);
}

export default OnboardingQuestionaire;
