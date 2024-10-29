import './OnboardingQuestionaire.styles.scss';

import { Skeleton } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import logEvent from 'api/common/logEvent';
import updateProfileAPI from 'api/onboarding/updateProfile';
import getAllOrgPreferences from 'api/preferences/getAllOrgPreferences';
import getOrgPreference from 'api/preferences/getOrgPreference';
import updateOrgPreferenceAPI from 'api/preferences/updateOrgPreference';
import getOrgUser from 'api/user/getOrgUser';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { InviteTeamMembersProps } from 'container/OrganizationSettings/PendingInvitesContainer';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { Dispatch, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_IS_FETCHING_ORG_PREFERENCES,
	UPDATE_ORG_PREFERENCES,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';

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

function OnboardingQuestionaire(): JSX.Element {
	const { notifications } = useNotifications();
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
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

	const { data: orgUsers, isLoading: isLoadingOrgUsers } = useQuery({
		queryFn: () =>
			getOrgUser({
				orgId: (org || [])[0].id,
			}),
		queryKey: ['getOrgUser', org?.[0].id],
	});

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [currentOrgData, setCurrentOrgData] = useState<OrgData | null>(null);
	const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(
		false,
	);

	const {
		data: onboardingPreferenceData,
		isLoading: isLoadingOnboardingPreference,
	} = useQuery({
		queryFn: () => getOrgPreference({ preferenceID: 'ORG_ONBOARDING' }),
		queryKey: ['getOrgPreferences', 'ORG_ONBOARDING'],
	});

	const { data: orgPreferences, isLoading: isLoadingOrgPreferences } = useQuery({
		queryFn: () => getAllOrgPreferences(),
		queryKey: ['getOrgPreferences'],
		enabled: isOnboardingComplete,
	});

	useEffect(() => {
		if (orgPreferences && !isLoadingOrgPreferences) {
			dispatch({
				type: UPDATE_IS_FETCHING_ORG_PREFERENCES,
				payload: {
					isFetchingOrgPreferences: false,
				},
			});

			dispatch({
				type: UPDATE_ORG_PREFERENCES,
				payload: {
					orgPreferences: orgPreferences.payload?.data || null,
				},
			});
		}
	}, [orgPreferences, dispatch, isLoadingOrgPreferences]);

	useEffect(() => {
		if (
			!isLoadingOnboardingPreference &&
			!isEmpty(onboardingPreferenceData?.payload?.data)
		) {
			const preferenceId = onboardingPreferenceData?.payload?.data?.preference_id;
			const preferenceValue =
				onboardingPreferenceData?.payload?.data?.preference_value;

			if (preferenceId === 'ORG_ONBOARDING') {
				setIsOnboardingComplete(preferenceValue as boolean);
			}
		}
	}, [onboardingPreferenceData, isLoadingOnboardingPreference]);

	const checkFirstTimeUser = (): boolean => {
		const users = orgUsers?.payload || [];

		const remainingUsers = users.filter(
			(user) => user.email !== 'admin@signoz.cloud',
		);

		return remainingUsers.length === 1;
	};

	useEffect(() => {
		// Only run this effect if the org users and preferences are loaded
		if (!isLoadingOrgUsers && !isLoadingOnboardingPreference) {
			const isFirstUser = checkFirstTimeUser();

			// Redirect to get started if it's not the first user or if the onboarding is complete
			if (!isFirstUser || isOnboardingComplete) {
				history.push(ROUTES.GET_STARTED);

				logEvent('User Onboarding: Redirected to Get Started', {
					isFirstUser,
					isOnboardingComplete,
				});
			} else {
				logEvent('User Onboarding: Started', {});
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isLoadingOrgUsers,
		isLoadingOnboardingPreference,
		isOnboardingComplete,
		orgUsers,
	]);

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
			setIsOnboardingComplete(true);
		},
		onError: (error) => {
			showErrorNotification(notifications, error as AxiosError);
		},
	});

	const handleUpdateProfile = (): void => {
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
				{(isLoadingOnboardingPreference || isLoadingOrgUsers) && (
					<div className="onboarding-questionaire-loading-container">
						<Skeleton />
					</div>
				)}

				{!isLoadingOnboardingPreference && !isLoadingOrgUsers && (
					<>
						{currentStep === 1 && (
							<OrgQuestions
								currentOrgData={currentOrgData}
								orgDetails={orgDetails}
								onNext={(orgDetails: OrgDetails): void => {
									setOrgDetails(orgDetails);
									setCurrentStep(2);
								}}
							/>
						)}

						{currentStep === 2 && (
							<AboutSigNozQuestions
								signozDetails={signozDetails}
								setSignozDetails={setSignozDetails}
								onBack={(): void => setCurrentStep(1)}
								onNext={(): void => setCurrentStep(3)}
							/>
						)}

						{currentStep === 3 && (
							<OptimiseSignozNeeds
								isNextDisabled={isNextDisabled}
								isUpdatingProfile={isUpdatingProfile}
								optimiseSignozDetails={optimiseSignozDetails}
								setOptimiseSignozDetails={setOptimiseSignozDetails}
								onBack={(): void => setCurrentStep(2)}
								onNext={handleUpdateProfile}
								onWillDoLater={(): void => setCurrentStep(4)} // This is temporary, only to skip gateway api call as it's not setup on staging yet
							/>
						)}

						{currentStep === 4 && (
							<InviteTeamMembers
								teamMembers={teamMembers}
								setTeamMembers={setTeamMembers}
								onBack={(): void => setCurrentStep(3)}
								onNext={handleOnboardingComplete}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export default OnboardingQuestionaire;
