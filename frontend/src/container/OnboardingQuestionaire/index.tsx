import './OnboardingQuestionaire.styles.scss';

import { Skeleton } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import updateProfileAPI from 'api/onboarding/updateProfile';
import getOrgPreference from 'api/preferences/getOrgPreference';
import updateOrgPreferenceAPI from 'api/preferences/updateOrgPreference';
import editOrg from 'api/user/editOrg';
import getOrgUser from 'api/user/getOrgUser';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { InviteTeamMembersProps } from 'container/OrganizationSettings/PendingInvitesContainer';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ORG_NAME } from 'types/actions/app';
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

	const { t } = useTranslation(['organizationsettings', 'common']);
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);

	const { data: orgUsers, isLoading: isLoadingOrgUsers } = useQuery({
		queryFn: () =>
			getOrgUser({
				orgId: (org || [])[0].id,
			}),
		queryKey: ['getOrgUser', org?.[0].id],
	});

	console.log('orgUsers', orgUsers, isLoadingOrgUsers);

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [orgData, setOrgData] = useState<OrgData | null>(null);
	const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(
		false,
	);

	const { data: orgPreferences, isLoading: isLoadingOrgPreferences } = useQuery({
		queryFn: () => getOrgPreference({ preferenceID: 'ORG_ONBOARDING' }),
		queryKey: ['getOrgPreferences', 'ORG_ONBOARDING'],
	});

	useEffect(() => {
		if (!isLoadingOrgPreferences && !isEmpty(orgPreferences?.payload?.data)) {
			const preferenceId = orgPreferences?.payload?.data?.preference_id;
			const preferenceValue = orgPreferences?.payload?.data?.preference_value;

			if (preferenceId === 'ORG_ONBOARDING') {
				setIsOnboardingComplete(preferenceValue as boolean);
			}
		}
	}, [orgPreferences, isLoadingOrgPreferences]);

	const checkFirstTimeUser = (): boolean => {
		const users = orgUsers?.payload || [];

		const remainingUsers = users.filter(
			(user) => user.email !== 'admin@signoz.cloud',
		);

		return remainingUsers.length === 1;
	};

	useEffect(() => {
		const isFirstUser = checkFirstTimeUser();

		if (isOnboardingComplete || !isFirstUser) {
			history.push(ROUTES.GET_STARTED);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOnboardingComplete, orgUsers]);

	useEffect(() => {
		if (org) {
			setOrgData(org[0]);

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

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const handleOrgNameUpdate = async (): Promise<void> => {
		/* Early bailout if orgData is not set or if the organisation name is not set or if the organisation name is empty or if the organisation name is the same as the one in the orgData */
		if (
			!orgData ||
			!orgDetails.organisationName ||
			orgDetails.organisationName === '' ||
			orgData.name === orgDetails.organisationName
		) {
			setCurrentStep(2);

			return;
		}

		try {
			setIsLoading(true);
			const { statusCode, error } = await editOrg({
				isAnonymous: orgData?.isAnonymous,
				name: orgDetails.organisationName,
				orgId: orgData?.id,
			});
			if (statusCode === 200) {
				dispatch({
					type: UPDATE_ORG_NAME,
					payload: {
						orgId: orgData?.id,
						name: orgDetails.organisationName,
					},
				});

				setCurrentStep(2);
			} else {
				notifications.error({
					message:
						error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	const handleOrgDetailsUpdate = (): void => {
		handleOrgNameUpdate();
	};

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
				{(isLoadingOrgPreferences || isLoadingOrgUsers) && (
					<div className="onboarding-questionaire-loading-container">
						<Skeleton />
					</div>
				)}

				{!isLoadingOrgPreferences && !isLoadingOrgUsers && (
					<>
						{currentStep === 1 && (
							<OrgQuestions
								isLoading={isLoading}
								orgDetails={orgDetails}
								setOrgDetails={setOrgDetails}
								onNext={handleOrgDetailsUpdate}
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
