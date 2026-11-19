/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { accessFor } from '@/storybook/access/access';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { type ingestionMocks, untilLoaded } from '../Ingestion.stories.mocks';
import { LIMIT_SIGNALS } from './ingestion';

type IngestionArgs = PageStoryArgs<typeof ingestionMocks>;

interface PlayContext {
	canvasElement: HTMLElement;
	args: IngestionArgs;
}

const FIRST_KEY = /production-us-east/i;
const SEARCH_PLACEHOLDER = 'Search for ingestion key...';

const LIST_KEY = 'list:ingestion-key';
const CREATE_KEY = 'create:ingestion-key';
const UPDATE_KEY = 'update:ingestion-key';
const DELETE_KEY = 'delete:ingestion-key';
const ATTACH_KEY = 'attach:ingestion-key';
const DETACH_KEY = 'detach:ingestion-key';
const CREATE_LIMIT = 'create:ingestion-limit';
const UPDATE_LIMIT = 'update:ingestion-limit';
const DELETE_LIMIT = 'delete:ingestion-limit';

const allows = (args: IngestionArgs, ...permissions: string[]): boolean => {
	const held = accessFor(
		args.access,
		args.permissions,
		args.revoked,
	).permissions;
	return permissions.every((permission) => held.has(permission));
};

const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true';

const expectGated = (
	element: HTMLElement,
	args: IngestionArgs,
	...permissions: string[]
): Promise<void> =>
	waitFor(
		() => expect(isDisabled(element)).toBe(!allows(args, ...permissions)),
		untilLoaded,
	);

const hasRows = (args: IngestionArgs): boolean =>
	args.dataState === 'loaded' &&
	args.authzState === 'loaded' &&
	args.keys > 0 &&
	allows(args, LIST_KEY);

const openFirstKey = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(FIRST_KEY, undefined, untilLoaded),
	);
};

const openKeyModal = async (
	canvasElement: HTMLElement,
	label: 'Edit ingestion key' | 'Delete ingestion key',
): Promise<void> => {
	const [button] = await within(canvasElement).findAllByLabelText(
		label,
		undefined,
		untilLoaded,
	);
	await userEvent.click(button);
};

export const expectListDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.authzState !== 'loaded') {
		return;
	}
	const search = await within(canvasElement).findByPlaceholderText(
		SEARCH_PLACEHOLDER,
		undefined,
		untilLoaded,
	);
	await expectGated(search, args, LIST_KEY);
	if (!allows(args, LIST_KEY)) {
		await within(canvasElement).findByText(
			/is not authorized/,
			undefined,
			untilLoaded,
		);
	}
};

export const expectCreateDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.authzState !== 'loaded') {
		return;
	}
	const button = await within(canvasElement).findByTestId(
		'ingestion-key-add-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(button, args, CREATE_KEY);
};

export const expectUpdateDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!hasRows(args)) {
		return;
	}
	await openKeyModal(canvasElement, 'Edit ingestion key');
	const button = await screen.findByTestId(
		'ingestion-key-update-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(button, args, UPDATE_KEY);
};

export const expectDeleteDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!hasRows(args)) {
		return;
	}
	await openKeyModal(canvasElement, 'Delete ingestion key');
	const button = await screen.findByTestId(
		'ingestion-key-delete-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(button, args, DELETE_KEY);
};

export const expectNewLimitDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const signal = LIMIT_SIGNALS.find((name) => !args.limits.includes(name));
	if (!hasRows(args) || !signal) {
		return;
	}
	await openFirstKey(canvasElement);
	await userEvent.click(
		await screen.findByTestId(
			`ingestion-limit-add-btn-${signal}`,
			undefined,
			untilLoaded,
		),
	);
	const save = await screen.findByTestId(
		'ingestion-limit-save-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(save, args, CREATE_LIMIT, ATTACH_KEY);
};

export const expectLimitUpdateDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const [signal] = args.limits;
	if (!hasRows(args) || !signal) {
		return;
	}
	await openFirstKey(canvasElement);
	await userEvent.click(
		await screen.findByTestId(
			`ingestion-limit-edit-btn-${signal}`,
			undefined,
			untilLoaded,
		),
	);
	const save = await screen.findByTestId(
		'ingestion-limit-save-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(save, args, UPDATE_LIMIT);
};

export const expectLimitDeleteDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const [signal] = args.limits;
	if (!hasRows(args) || !signal) {
		return;
	}
	await openFirstKey(canvasElement);
	await userEvent.click(
		await screen.findByTestId(
			`ingestion-limit-delete-open-btn-${signal}`,
			undefined,
			untilLoaded,
		),
	);
	const confirm = await screen.findByTestId(
		'ingestion-limit-delete-btn',
		undefined,
		untilLoaded,
	);
	await expectGated(confirm, args, DELETE_LIMIT, DETACH_KEY);
};
