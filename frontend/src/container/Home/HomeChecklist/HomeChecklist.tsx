import './HomeChecklist.styles.scss';

import { Button } from 'antd';
import { ArrowRight, ArrowRightToLine, BookOpenText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export type ChecklistItem = {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	isSkipped: boolean;
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

			<div className="whats-next-checklist-container">
				<div className="whats-next-checklist-title">What&apos;s Next</div>

				<div className="whats-next-checklist-items-container">
					{whatsNextChecklistItems.map((item, index) => (
						<div
							key={item.id}
							className={`whats-next-checklist-item ${
								item.isSkipped && !item.completed ? 'skipped' : ''
							} ${index === 0 && !item.isSkipped && !item.completed ? 'active' : ''} ${
								isLoading ? 'loading' : ''
							}`}
						>
							<div className="whats-next-checklist-item-title">{item.title}</div>

							<div className="whats-next-checklist-item-content">
								<div className="whats-next-checklist-item-description">
									{item.description}
								</div>

								<div className="whats-next-checklist-item-action-buttons">
									<div className="whats-next-checklist-item-action-buttons-container">
										<Link to={item.toRoute || ''}>
											<Button type="default" className="periscope-btn secondary">
												Get Started &nbsp; <ArrowRight size={16} />
											</Button>
										</Link>

										{item.docsLink && (
											<Button
												type="default"
												className="periscope-btn secondary"
												onClick={(): void => {
													window?.open(item.docsLink, '_blank');
												}}
											>
												<BookOpenText size={16} />
											</Button>
										)}
									</div>

									<div className="whats-next-checklist-item-action-buttons-container">
										<Button
											type="link"
											className="periscope-btn link skip-btn"
											onClick={(): void => onSkip(item)}
											disabled={isLoading}
											loading={isLoading}
											icon={<ArrowRightToLine size={16} />}
										>
											Skip for now
										</Button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default HomeChecklist;
