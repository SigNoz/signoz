import './OnboardingQuestionaire.styles.scss';

import { NotificationInstance } from 'antd/es/notification/interface';
import updateProfileAPI from 'api/onboarding/updateProfile';
import editOrg from 'api/user/editOrg';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { InviteTeamMembersProps } from 'container/OrganizationSettings/PendingInvitesContainer';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
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
import { OnboardingFooter } from './OnboardingFooter/OnboardingFooter';
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
	logsPerDay: 25,
	hostsPerDay: 40,
	services: 10,
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
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [orgData, setOrgData] = useState<OrgData | null>(null);

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
			onSuccess: (data) => {
				console.log('data', data);

				setCurrentStep(4);
			},
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

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
		history.push('/');
	};

	return (
		<div className="onboarding-questionaire-container">
			<div className="onboarding-questionaire-header">
				<OnboardingHeader />
			</div>

			<div className="onboarding-questionaire-content">
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
						isUpdatingProfile={isUpdatingProfile}
						optimiseSignozDetails={optimiseSignozDetails}
						setOptimiseSignozDetails={setOptimiseSignozDetails}
						onBack={(): void => setCurrentStep(2)}
						onNext={handleUpdateProfile}
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
			</div>

			<div className="onboarding-questionaire-footer">
				<OnboardingFooter />
			</div>
		</div>
	);
}

export default OnboardingQuestionaire;
