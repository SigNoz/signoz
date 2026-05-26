// Package blockkit provides a goldmark extension that renders markdown as
// Slack Block Kit JSON (an array of blocks suitable for the Slack API's
// `blocks` payload field).
//
// The current Slack notifier uses the sibling mrkdwn package instead, because
// Block Kit's hard limits (one table per message, 50 blocks per message,
// 12k-character total text) would silently truncate or reject notifications
// with rich bodies. This package is kept in tree for future use.
package blockkit
