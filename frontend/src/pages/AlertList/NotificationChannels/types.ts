import type { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesListedNotificationChannelDTO';

/** A channel as the list API returns it: identity and kind, but no config. */
export type Channel = AlertmanagertypesListedNotificationChannelDTO;
