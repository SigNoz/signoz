// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

// Package googlechat provides a goldmark extension that renders markdown as
// Google Chat's webhook text format.
//
// Google Chat webhooks support a limited markdown subset with different syntax
// than standard markdown: *bold* (not **bold**), _italic_ (not *italic*),
// ~strikethrough~ (not ~~strikethrough~~), and <url|text> links (not [text](url)).
//
// This renderer converts standard markdown to Google Chat's format, allowing
// custom alert templates authored in standard markdown to display correctly
// in Google Chat notifications.
package googlechat
