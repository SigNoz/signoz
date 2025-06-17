import './ChangelogModal.styles.scss';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Modal, Skeleton } from 'antd';
import getChangelogByVersion from 'api/changelog/getChangelogByVersion';
import cx from 'classnames';
import { ChevronsDown, ScrollText } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { formatDate } from 'utils/dateUtils';

import ChangelogRenderer from './components/ChangelogRenderer';

interface Props {
	onClose: () => void;
}

function ChangelogModal({ onClose }: Props): JSX.Element {
	const [hasScroll, setHasScroll] = useState(false);
	const changelogContentSectionRef = useRef<HTMLDivElement>(null);
	const { isLoggedIn } = useAppContext();
	const { latestVersion } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const getChangelogByVersionResponse = useQuery({
		queryFn: () => getChangelogByVersion(latestVersion),
		queryKey: ['getChangelogByVersion', latestVersion],
		enabled: isLoggedIn,
	});

	const checkScroll = useCallback((): void => {
		if (changelogContentSectionRef.current) {
			const {
				scrollHeight,
				clientHeight,
				scrollTop,
			} = changelogContentSectionRef.current;
			const isAtBottom = scrollHeight - clientHeight - scrollTop <= 8;
			setHasScroll(scrollHeight > clientHeight + 24 && !isAtBottom); // 24px - buffer height to show show more
		}
	}, []);

	useEffect(() => {
		checkScroll();
		const changelogContentSection = changelogContentSectionRef.current;

		if (changelogContentSection) {
			changelogContentSection.addEventListener('scroll', checkScroll);
		}

		return (): void => {
			if (changelogContentSection) {
				changelogContentSection.removeEventListener('scroll', checkScroll);
			}
		};
	}, [checkScroll]);

	const handleUpdateWorkspaceClick = (): void => {
		window.open('https://signoz.io/docs/operate/migration/', '_blank');
	};

	const handleScrollForMore = (): void => {
		if (changelogContentSectionRef.current) {
			changelogContentSectionRef.current.scrollTo({
				top: changelogContentSectionRef.current.scrollTop + 600, // Scroll 600px from the current position
				behavior: 'smooth',
			});
		}
	};

	return (
		<Modal
			className={cx('changelog-modal')}
			title={
				<div className="changelog-modal-title">
					<ScrollText size={16} />
					<span>
						What’s New ⎯ Changelog :{' '}
						{getChangelogByVersionResponse.data?.payload?.release_date &&
							formatDate(
								getChangelogByVersionResponse.data?.payload?.release_date as string,
							)}
					</span>
				</div>
			}
			width={820}
			open
			onCancel={onClose}
			footer={
				<div
					className={cx('changelog-modal-footer', hasScroll && 'scroll-available')}
				>
					<span className="changelog-modal-footer-label">
						{getChangelogByVersionResponse.data?.payload?.features.length} new
						features, 12 bug fixes
					</span>
					<div>
						<Button
							type="default"
							icon={<CloseOutlined size={14} />}
							onClick={onClose}
						>
							Skip for now
						</Button>
						<Button
							type="primary"
							icon={<CheckOutlined size={14} />}
							onClick={handleUpdateWorkspaceClick}
						>
							Update my workspace
						</Button>
					</div>
					{getChangelogByVersionResponse.data?.payload && (
						<div className="scroll-btn-container">
							<button
								type="button"
								className="scroll-btn"
								onClick={handleScrollForMore}
							>
								<ChevronsDown size={14} />
								<span>Scroll for more</span>
							</button>
						</div>
					)}
				</div>
			}
		>
			<div className="changelog-modal-content" ref={changelogContentSectionRef}>
				{getChangelogByVersionResponse.isLoading ? (
					<Skeleton active paragraph={{ rows: 24 }} />
				) : (
					getChangelogByVersionResponse.data?.payload && (
						<ChangelogRenderer
							changelog={getChangelogByVersionResponse.data?.payload}
						/>
					)
				)}
			</div>
		</Modal>
	);
}

export default ChangelogModal;
