import './ChangelogModal.styles.scss';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import cx from 'classnames';
import dayjs from 'dayjs';
import { ChevronsDown, ScrollText } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useRef, useState } from 'react';

import ChangelogRenderer from './components/ChangelogRenderer';

interface Props {
	onClose: () => void;
}

function ChangelogModal({ onClose }: Props): JSX.Element {
	const [hasScroll, setHasScroll] = useState(false);
	const changelogContentSectionRef = useRef<HTMLDivElement>(null);
	const { changelog } = useAppContext();

	const formattedReleaseDate = dayjs(changelog?.release_date).format(
		'MMMM D, YYYY',
	);

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

	const onClickUpdateWorkspace = (): void => {
		window.open(
			'https://github.com/SigNoz/signoz/releases',
			'_blank',
			'noopener,noreferrer',
		);
	};

	const onClickScrollForMore = (): void => {
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
					What’s New ⎯ Changelog : {formattedReleaseDate}
				</div>
			}
			width={820}
			open
			onCancel={onClose}
			footer={
				<div
					className={cx('changelog-modal-footer', hasScroll && 'scroll-available')}
				>
					{changelog?.features && changelog.features.length > 0 && (
						<span className="changelog-modal-footer-label">
							{changelog.features.length} new&nbsp;
							{changelog.features.length > 1 ? 'features' : 'feature'}
						</span>
					)}
					<div className="changelog-modal-footer-ctas">
						<Button type="default" icon={<CloseOutlined />} onClick={onClose}>
							Skip for now
						</Button>
						<Button
							type="primary"
							icon={<CheckOutlined />}
							onClick={onClickUpdateWorkspace}
						>
							Update my workspace
						</Button>
					</div>
					{changelog && (
						<div className="scroll-btn-container">
							<button
								data-testid="scroll-more-btn"
								type="button"
								className="scroll-btn"
								onClick={onClickScrollForMore}
							>
								<ChevronsDown size={14} />
								<span>Scroll for more</span>
							</button>
						</div>
					)}
				</div>
			}
		>
			<div
				className="changelog-modal-content"
				data-testid="changelog-content"
				ref={changelogContentSectionRef}
			>
				{changelog && <ChangelogRenderer changelog={changelog} />}
			</div>
		</Modal>
	);
}

export default ChangelogModal;
