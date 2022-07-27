import { Col, Row, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EQueryType } from 'types/common/dashboard';

import {
	StyledList,
	StyledListItem,
	StyledMainContainer,
	StyledTopic,
} from './styles';

function UserGuide({ queryType }: UserGuideProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const renderStep1QB = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_qb_step1')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_qb_step1a')}</StyledListItem>
					<StyledListItem>{t('user_guide_qb_step1b')}</StyledListItem>
					<StyledListItem>{t('user_guide_qb_step1c')}</StyledListItem>
					<StyledListItem>{t('user_guide_qb_step1d')}</StyledListItem>
				</StyledList>
			</>
		);
	};
	const renderStep2QB = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_qb_step2')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_qb_step2a')}</StyledListItem>
					<StyledListItem>{t('user_guide_qb_step2b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderStep3QB = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_qb_step3')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_qb_step3a')}</StyledListItem>
					<StyledListItem>{t('user_guide_qb_step3b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderGuideForQB = (): JSX.Element => {
		return (
			<>
				{renderStep1QB()}
				{renderStep2QB()}
				{renderStep3QB()}
			</>
		);
	};
	const renderStep1PQL = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_pql_step1')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_pql_step1a')}</StyledListItem>
					<StyledListItem>{t('user_guide_pql_step1b')}</StyledListItem>
				</StyledList>
			</>
		);
	};
	const renderStep2PQL = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_pql_step2')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_pql_step2a')}</StyledListItem>
					<StyledListItem>{t('user_guide_pql_step2b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderStep3PQL = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_pql_step3')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_pql_step3a')}</StyledListItem>
					<StyledListItem>{t('user_guide_pql_step3b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderGuideForPQL = (): JSX.Element => {
		return (
			<>
				{renderStep1PQL()}
				{renderStep2PQL()}
				{renderStep3PQL()}
			</>
		);
	};

	return (
		<StyledMainContainer>
			<Row>
				<Col flex="auto">
					<Typography.Paragraph> {t('user_guide_headline')} </Typography.Paragraph>
				</Col>
				<Col flex="none">
					<TextToolTip
						text={t('user_tooltip_more_help')}
						url="https://signoz.io/docs/userguide/alerts-management/#create-alert-rules"
					/>
				</Col>
			</Row>
			{queryType === EQueryType.QUERY_BUILDER && renderGuideForQB()}
			{queryType === EQueryType.PROM && renderGuideForPQL()}
		</StyledMainContainer>
	);
}

interface UserGuideProps {
	queryType: EQueryType;
}

export default UserGuide;
