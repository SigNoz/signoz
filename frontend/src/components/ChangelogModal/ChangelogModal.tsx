import './ChangelogModal.styles.scss';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import cx from 'classnames';
import { USER_PREFERENCES } from 'constants/userPreferences';
import dayjs from 'dayjs';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { ChevronsDown, ScrollText } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';
import { UserPreference } from 'types/api/preferences/preference';

import ChangelogRenderer from './components/ChangelogRenderer';

interface Props {
	changelog: ChangelogSchema;
	onClose: () => void;
}

function ChangelogModal({ changelog, onClose }: Props): JSX.Element {
	const [hasScroll, setHasScroll] = useState(false);
	const changelogContentSectionRef = useRef<HTMLDivElement>(null);
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();

	const formattedReleaseDate = dayjs(changelog?.release_date).format(
		'MMMM D, YYYY',
	);

	const { isCloudUser } = useGetTenantLicense();

	const seenChangelogVersion = userPreferences?.find(
		(preference) =>
			preference.name === USER_PREFERENCES.LAST_SEEN_CHANGELOG_VERSION,
	)?.value as string;

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
	);

	useEffect(() => {
		// Update the seen version
		if (seenChangelogVersion !== changelog.version) {
			const version = {
				name: USER_PREFERENCES.LAST_SEEN_CHANGELOG_VERSION,
				value: changelog.version,
			};
			updateUserPreferenceInContext(version as UserPreference);
			updateUserPreferenceMutation(version);
		}
	}, [
		seenChangelogVersion,
		changelog.version,
		updateUserPreferenceMutation,
		updateUserPreferenceInContext,
	]);

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
			'https://signoz.io/upgrade-path',
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
					{!isCloudUser && (
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
					)}
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
