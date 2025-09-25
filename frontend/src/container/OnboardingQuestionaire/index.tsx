import './OnboardingQuestionaire.styles.scss';

import { NotificationInstance } from 'antd/es/notification/interface';
import logEvent from 'api/common/logEvent';
import updateProfileAPI from 'api/onboarding/updateProfile';
import listOrgPreferences from 'api/v1/org/preferences/list';
import updateOrgPreferenceAPI from 'api/v1/org/preferences/name/update';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { FeatureKeys } from 'constants/features';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
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
	usesOtel: null,
};

const INITIAL_SIGNOZ_DETAILS: SignozDetails = {
	interestInSignoz: [],
	otherInterestInSignoz: '',
	discoverSignoz: '',
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
	const { org, updateOrgPreferences, featureFlags } = useAppContext();
	const isOnboardingV3Enabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.ONBOARDING_V3,
	)?.active;
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
				organisationName: org[0].displayName,
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
		queryFn: () => listOrgPreferences(),
		queryKey: ['getOrgPreferences'],
		enabled: false,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (response.data) {
				updateOrgPreferences(response.data);
			}

			setUpdatingOrgOnboardingStatus(false);

			logEvent('Org Onboarding: Redirecting to Get Started', {});

			if (isOnboardingV3Enabled) {
				history.push(ROUTES.GET_STARTED_WITH_CLOUD);
			} else {
				history.push(ROUTES.GET_STARTED);
			}
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

				// Allow user to proceed even if API fails
				setCurrentStep(4);
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
			uses_otel: orgDetails?.usesOtel as boolean,
			has_existing_observability_tool: orgDetails?.usesObservability as boolean,
			existing_observability_tool:
				orgDetails?.observabilityTool === 'Others'
					? (orgDetails?.otherTool as string)
					: (orgDetails?.observabilityTool as string),
			where_did_you_discover_signoz: signozDetails?.discoverSignoz as string,
			reasons_for_interest_in_signoz: signozDetails?.interestInSignoz?.includes(
				'Others',
			)
				? ([
						...(signozDetails?.interestInSignoz?.filter(
							(item) => item !== 'Others',
						) || []),
						signozDetails?.otherInterestInSignoz,
				  ] as string[])
				: (signozDetails?.interestInSignoz as string[]),
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
			name: ORG_PREFERENCES.ORG_ONBOARDING,
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
						onWillDoLater={handleUpdateProfile}
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
