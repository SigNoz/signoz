/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	findSuggestion,
	openKeySuggestions,
	typeFilter,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { screen, userEvent, within } from 'storybook/test';

import type { PodsArgs } from '../Kubernetes.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PodsArgs;
}

export const openDrawerLogsTab = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!args.drawer || args.dataState !== 'loaded' || args.telemetryRows === 0) {
		return;
	}

	const drawer = within(
		await screen.findByRole('dialog', {}, { timeout: 10000 }),
	);

	await userEvent.click(await drawer.findByText('Logs', {}, { timeout: 10000 }));
	await drawer.findAllByText(/handled request in/, {}, { timeout: 10000 });
};

export const openDrawerLogDetails = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!args.drawer || args.dataState !== 'loaded' || args.telemetryRows === 0) {
		return;
	}

	const drawer = within(
		await screen.findByRole('dialog', {}, { timeout: 10000 }),
	);

	await userEvent.click(await drawer.findByText('Logs', {}, { timeout: 10000 }));
	const [line] = await drawer.findAllByText(
		/handled request in/,
		{},
		{ timeout: 10000 },
	);

	await userEvent.click(line);
	await screen.findByTestId('log-detail-drawer', {}, { timeout: 10000 });
};

export const copyPodName = async ({ args }: PlayContext): Promise<void> => {
	if (!args.drawer) {
		return;
	}

	await userEvent.click(
		await screen.findByTestId('copy-id-button', {}, { timeout: 10000 }),
	);
	await screen.findByText('Pod name copied to clipboard');
};

export const copyPodMetadata = async ({ args }: PlayContext): Promise<void> => {
	if (!args.drawer || args.dataState !== 'loaded') {
		return;
	}

	await userEvent.click(
		await screen.findByTestId('copy-metadata-namespace', {}, { timeout: 10000 }),
	);
	await screen.findByText('NAMESPACE copied to clipboard');
};

export const openTableOptions = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	// The drawer covers the list, so its options are out of reach.
	if (args.drawer) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByTestId(
			'k8s-table-options-button',
			{},
			{ timeout: 10000 },
		),
	);
	await screen.findByText('Columns');
};

export const suggestFilterKeys = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	await openKeySuggestions(canvasElement, 'k8s.node.name');
};

export const suggestFilterValues = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	await typeFilter(canvasElement, 'k8s.namespace.name = ');
	await findSuggestion(canvasElement, 'kube-system');
};
