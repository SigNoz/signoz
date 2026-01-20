/* eslint-disable sonarjs/cognitive-complexity */
import './HomeChecklist.styles.scss';

import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ArrowRight, ArrowRightToLine, BookOpenText } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { LicensePlatform } from 'types/api/licensesV3/getActive';
import { USER_ROLES } from 'types/roles';

export type ChecklistItem = {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	isSkipped: boolean;
	isSkippable?: boolean;
	skippedPreferenceKey?: string;
	toRoute?: string;
	docsLink?: string;
};

function HomeChecklist({
	checklistItems,
	onSkip,
	isLoading,
}: {
	checklistItems: ChecklistItem[];
	onSkip: (item: ChecklistItem) => void;
	isLoading: boolean;
}): JSX.Element {
	const { user, activeLicense } = useAppContext();

	const [completedChecklistItems, setCompletedChecklistItems] = useState<
		ChecklistItem[]
	>([]);

	const [whatsNextChecklistItems, setWhatsNextChecklistItems] = useState<
		ChecklistItem[]
	>([]);

	useEffect(() => {
		setCompletedChecklistItems(checklistItems.filter((item) => item.completed));
		setWhatsNextChecklistItems(checklistItems.filter((item) => !item.completed));
	}, [checklistItems]);

	return (
		<div className="home-checklist-container">
			<div className="completed-checklist-container">
				<div className="completed-checklist-title">Completed</div>

				{completedChecklistItems.map((item) => (
					<div key={item.id} className="completed-checklist-item">
						<div className="completed-checklist-item-title">{item.title}</div>
					</div>
				))}
			</div>

			{whatsNextChecklistItems.length > 0 && (
				<div className="whats-next-checklist-container">
					<div className="whats-next-checklist-title">What&apos;s Next</div>

					<div className="whats-next-checklist-items-container">
						{whatsNextChecklistItems.map((item, index) => (
							<div
								key={item.id}
								className={`whats-next-checklist-item ${
									item.isSkipped && !item.completed ? 'skipped' : ''
								} ${
									index === 0 && !item.isSkipped && !item.completed ? 'active' : ''
								} ${isLoading ? 'loading' : ''}`}
							>
								<div className="whats-next-checklist-item-title">{item.title}</div>

								<div className="whats-next-checklist-item-content">
									<div className="whats-next-checklist-item-description">
										{item.description}
									</div>

									{user?.role !== USER_ROLES.VIEWER && (
										<div className="whats-next-checklist-item-action-buttons">
											<div className="whats-next-checklist-item-action-buttons-container">
												<Button
													type="default"
													className="periscope-btn secondary"
													onClick={(): void => {
														logEvent('Welcome Checklist: Get started clicked', {
															step: item.id,
														});

														if (item.toRoute !== ROUTES.GET_STARTED_WITH_CLOUD) {
															history.push(item.toRoute || '');
														} else if (
															activeLicense &&
															activeLicense.platform === LicensePlatform.CLOUD
														) {
															history.push(item.toRoute || '');
														} else {
															window?.open(
																item.docsLink || '',
																'_blank',
																'noopener noreferrer',
															);
														}
													}}
												>
													Get Started &nbsp; <ArrowRight size={16} />
												</Button>

												{item.docsLink && (
													<Button
														type="default"
														className="periscope-btn secondary"
														onClick={(): void => {
															logEvent('Welcome Checklist: Docs clicked', {
																step: item.id,
															});

															window?.open(item.docsLink, '_blank', 'noopener noreferrer');
														}}
													>
														<BookOpenText size={16} />
													</Button>
												)}
											</div>

											{!item.isSkipped && item.isSkippable && (
												<div className="whats-next-checklist-item-action-buttons-container">
													<Button
														type="link"
														className="periscope-btn link skip-btn"
														onClick={(): void => {
															logEvent('Welcome Checklist: Skip clicked', {
																step: item.id,
															});
															onSkip(item);
														}}
														disabled={isLoading}
														loading={isLoading}
														icon={<ArrowRightToLine size={16} />}
													>
														Skip for now
													</Button>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default HomeChecklist;
