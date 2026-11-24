import { useEffect } from 'react';
import { useMutation } from 'react-query';
import { Check, ChevronsDown, ScrollText, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { USER_PREFERENCES } from 'constants/userPreferences';
import dayjs from 'dayjs';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';
import { UserPreference } from 'types/api/preferences/preference';

import ChangelogRenderer from './components/ChangelogRenderer';
import { useChangelogScroll } from './useChangelogScroll';

import styles from './ChangelogModal.module.scss';

interface Props {
	changelog: ChangelogSchema;
	onClose: () => void;
}

function ChangelogModal({ changelog, onClose }: Props): JSX.Element {
	const { contentRef, hasScroll, scrollForMore } = useChangelogScroll();
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();

	const formattedReleaseDate = dayjs(changelog?.release_date).format(
		'MMMM D, YYYY',
	);

	const { isCloudUser } = useGetTenantLicense();

	const seenChangelogVersion = userPreferences?.find(
		(preference) =>
			preference.name === USER_PREFERENCES.LAST_SEEN_CHANGELOG_VERSION,
	)?.value as string;

	const { mutate: updateUserPreferenceMutation } =
		useMutation(updateUserPreference);

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

	const onClickUpdateWorkspace = (): void => {
		window.open(
			'https://signoz.io/upgrade-path',
			'_blank',
			'noopener,noreferrer',
		);
	};

	return (
		<Dialog
			open
			onClose={onClose}
			title={`What’s New ⎯ Changelog : ${formattedReleaseDate}`}
			titleIcon={<ScrollText size={16} />}
			width="extra-wide"
			testId="changelog-dialog"
			footerSuffix={
				isCloudUser ? undefined : (
					<>
						<Button
							variant="outlined"
							color="secondary"
							size="md"
							prefix={<X size={12} />}
							onClick={onClose}
							testId="changelog-skip-btn"
						>
							Skip for now
						</Button>
						<Button
							variant="solid"
							color="primary"
							size="md"
							prefix={<Check size={12} />}
							onClick={onClickUpdateWorkspace}
							testId="changelog-update-btn"
						>
							Update my workspace
						</Button>
					</>
				)
			}
		>
			<div data-testid="changelog-content" ref={contentRef}>
				<ChangelogRenderer changelog={changelog} />
			</div>
			{hasScroll && (
				<div className={styles.scrollHint}>
					<div className={styles.scrollButton}>
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							prefix={<ChevronsDown size={14} className={styles.scrollIcon} />}
							onClick={scrollForMore}
							testId="scroll-more-btn"
						>
							Scroll for more
						</Button>
					</div>
				</div>
			)}
		</Dialog>
	);
}

export default ChangelogModal;
