import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardtypesPatchOpDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { toast } from '@signozhq/ui/sonner';
import { isEqual } from 'lodash-es';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
import CrossPanelSync from './CrossPanelSync/CrossPanelSync';
import DashboardInfoForm from './DashboardInfoForm/DashboardInfoForm';
import UnsavedChangesFooter from './UnsavedChangesFooter/UnsavedChangesFooter';
import { Base64Icons, stringsToTags, tagsToStrings } from './utils';
import styles from './Overview.module.scss';

interface OverviewProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

function Overview({ dashboard }: OverviewProps): JSX.Element {
	const id = dashboard.id;

	const { patchAsync } = useOptimisticPatch();

	const title = dashboard.spec.display.name;
	const description = dashboard.spec.display.description ?? '';
	const image = dashboard.image || Base64Icons[0];
	const tagsAsStrings = useMemo(
		() => tagsToStrings(dashboard.tags ?? []),
		[dashboard.tags],
	);

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tagsAsStrings);
	const [updatedDescription, setUpdatedDescription] =
		useState<string>(description);
	const [updatedImage, setUpdatedImage] = useState<string>(image);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] =
		useState<number>(0);

	const { showErrorModal } = useErrorModal();

	// Sync state when dashboard refetches after a save
	useEffect(() => {
		setUpdatedTitle(title);
		setUpdatedDescription(description);
		setUpdatedImage(image);
		setUpdatedTags(tagsAsStrings);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboard.updatedAt]);

	const buildPatch = useCallback((): DashboardtypesJSONPatchOperationDTO[] => {
		const ops: DashboardtypesJSONPatchOperationDTO[] = [];
		const op = (
			operation: DashboardtypesJSONPatchOperationDTO['op'],
			path: string,
			value: unknown,
		): DashboardtypesJSONPatchOperationDTO => ({ op: operation, path, value });
		const replace = (
			path: string,
			value: unknown,
		): DashboardtypesJSONPatchOperationDTO =>
			op(DashboardtypesPatchOpDTO.replace, path, value);

		if (updatedTitle !== title && updatedTitle !== '') {
			ops.push(replace('/spec/display/name', updatedTitle));
		}
		if (updatedDescription !== description) {
			// `replace` fails when the description doesn't exist yet, so add it when
			// the current one is empty (`add` creates or replaces the member).
			ops.push(
				op(
					description
						? DashboardtypesPatchOpDTO.replace
						: DashboardtypesPatchOpDTO.add,
					'/spec/display/description',
					updatedDescription,
				),
			);
		}
		if (updatedImage !== image) {
			// `replace` fails when the image doesn't exist yet, so add it when the
			// dashboard has none (`add` creates or replaces the member). Key off the
			// raw stored value, not the `Base64Icons[0]`-defaulted local `image`.
			ops.push(
				op(
					dashboard.image
						? DashboardtypesPatchOpDTO.replace
						: DashboardtypesPatchOpDTO.add,
					'/image',
					updatedImage,
				),
			);
		}
		if (!isEqual(updatedTags, tagsAsStrings)) {
			ops.push(replace('/tags', stringsToTags(updatedTags)));
		}
		return ops;
	}, [
		updatedTitle,
		title,
		updatedDescription,
		description,
		updatedImage,
		image,
		dashboard.image,
		updatedTags,
		tagsAsStrings,
	]);

	const onSaveHandler = useCallback(async (): Promise<void> => {
		const ops = buildPatch();
		if (ops.length === 0) {
			return;
		}

		try {
			setIsSaving(true);
			await patchAsync(ops);
			toast.success('Dashboard updated');
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSaving(false);
		}
	}, [buildPatch, patchAsync, showErrorModal]);

	useEffect(() => {
		let numberOfUnsavedChanges = 0;
		const initialValues = [title, description, tagsAsStrings, image];
		const updatedValues = [
			updatedTitle,
			updatedDescription,
			updatedTags,
			updatedImage,
		];
		initialValues.forEach((val, index) => {
			if (!isEqual(val, updatedValues[index])) {
				numberOfUnsavedChanges += 1;
			}
		});
		setNumberOfUnsavedChanges(numberOfUnsavedChanges);
	}, [
		description,
		image,
		tagsAsStrings,
		title,
		updatedDescription,
		updatedImage,
		updatedTags,
		updatedTitle,
	]);

	const discardHandler = useCallback((): void => {
		setUpdatedTitle(title);
		setUpdatedImage(image);
		setUpdatedTags(tagsAsStrings);
		setUpdatedDescription(description);
	}, [title, image, tagsAsStrings, description]);

	return (
		<div className={styles.overviewContent}>
			<DashboardInfoForm
				title={updatedTitle}
				description={updatedDescription}
				image={updatedImage}
				tags={updatedTags}
				onTitleChange={setUpdatedTitle}
				onDescriptionChange={setUpdatedDescription}
				onImageChange={setUpdatedImage}
				onTagsChange={setUpdatedTags}
			/>
			<CrossPanelSync dashboardId={id} />
			{numberOfUnsavedChanges > 0 && (
				<UnsavedChangesFooter
					count={numberOfUnsavedChanges}
					isSaving={isSaving}
					onDiscard={discardHandler}
					onSave={onSaveHandler}
				/>
			)}
		</div>
	);
}

export default Overview;
