import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

/** A channel as the list API returns it: identity and kind, but no config. */
export type Channel = AlertmanagertypesListedNotificationChannelDTO;
