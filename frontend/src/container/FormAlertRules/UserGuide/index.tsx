import { Col, Row, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
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

	const renderStep1CH = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_ch_step1')}</StyledTopic>
				<StyledList>
					<StyledListItem>
						<Trans
							i18nKey="user_guide_ch_step1a"
							t={t}
							components={[
								// eslint-disable-next-line jsx-a11y/control-has-associated-label, jsx-a11y/anchor-has-content
								<a
									key={1}
									target="_blank"
									href=" https://signoz.io/docs/tutorial/writing-clickhouse-queries-in-dashboard/?utm_source=frontend&utm_medium=product&utm_id=alerts</>"
								/>,
							]}
						/>
					</StyledListItem>
					<StyledListItem>{t('user_guide_ch_step1b')}</StyledListItem>
				</StyledList>
			</>
		);
	};
	const renderStep2CH = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_ch_step2')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_ch_step2a')}</StyledListItem>
					<StyledListItem>{t('user_guide_ch_step2b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderStep3CH = (): JSX.Element => {
		return (
			<>
				<StyledTopic>{t('user_guide_ch_step3')}</StyledTopic>
				<StyledList>
					<StyledListItem>{t('user_guide_ch_step3a')}</StyledListItem>
					<StyledListItem>{t('user_guide_ch_step3b')}</StyledListItem>
				</StyledList>
			</>
		);
	};

	const renderGuideForCH = (): JSX.Element => {
		return (
			<>
				{renderStep1CH()}
				{renderStep2CH()}
				{renderStep3CH()}
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
			{queryType === EQueryType.CLICKHOUSE && renderGuideForCH()}
		</StyledMainContainer>
	);
}

interface UserGuideProps {
	queryType: EQueryType;
}

export default UserGuide;
