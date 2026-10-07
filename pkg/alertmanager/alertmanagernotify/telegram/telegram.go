// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2022 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

// Package telegram delivers alerts to a Telegram chat. It follows upstream's
// notifier for everything about the transport and adds the per-rule title and
// body templates carried on the _title_template and _body_template
// annotations.
package telegram

import (
	"context"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	telebot "gopkg.in/telebot.v3"
)

const (
	Integration = "telegram"

	// Telegram supports 4096 chars max - from https://limits.tginfo.me/en.
	maxMessageLenRunes = 4096

	parseModeHTML = "HTML"
)

type Notifier struct {
	conf      *config.TelegramConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *telebot.Bot
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

func New(conf *config.TelegramConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "telegram http_config is nil")
	}

	if conf.APIUrl == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "telegram api_url is nil")
	}

	// Rendering targets the HTML subset only. A receiver written through the v1
	// API can still carry another mode, and sending HTML-escaped text under it
	// would mangle the message, so the integration refuses to build instead.
	if conf.ParseMode != parseModeHTML {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "telegram parse_mode %q is not supported, only %s is", conf.ParseMode, parseModeHTML)
	}

	httpclient, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	client, err := telebot.NewBot(telebot.Settings{
		URL:       conf.APIUrl.String(),
		ParseMode: conf.ParseMode,
		Client:    httpclient,
		Offline:   true,
	})
	if err != nil {
		return nil, err
	}

	return &Notifier{
		conf:      conf,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{},
		templater: templater,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	logger := n.logger.With(slog.String("group_key", key.String()))

	messageText, err := n.buildMessage(ctx, logger, as)
	if err != nil {
		return false, err
	}

	messageText, truncated := notify.TruncateInRunes(messageText, maxMessageLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated message", slog.Int("max_runes", maxMessageLenRunes))
	}

	botToken, err := n.getBotToken()
	if err != nil {
		return true, err
	}
	n.client.Token = botToken

	chatID, err := n.getChatID()
	if err != nil {
		return true, err
	}

	message, err := n.client.Send(telebot.ChatID(chatID), messageText, &telebot.SendOptions{
		DisableNotification:   n.conf.DisableNotifications,
		DisableWebPagePreview: true,
		ThreadID:              n.conf.MessageThreadID,
		ParseMode:             n.conf.ParseMode,
	})
	if err != nil {
		return true, notify.NewErrorWithReason(notify.ClientErrorReason, err)
	}

	logger.DebugContext(ctx, "telegram message published", slog.Int("message_id", message.ID), slog.Int64("chat_id", message.Chat.ID))

	return false, nil
}

// buildMessage renders the channel's own message template unless the rule
// carries templates of its own, in which case those replace it.
func (n *Notifier) buildMessage(ctx context.Context, logger *slog.Logger, as []*types.Alert) (string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)
	if customTitle == "" && customBody == "" {
		return n.renderChannelTemplate(ctx, as)
	}

	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate: customTitle,
		BodyTemplate:  customBody,
	}, as)
	if err != nil {
		return "", err
	}

	if len(result.MissingVars) > 0 {
		logger.WarnContext(ctx, "unresolved variables in rule template", slog.Any("template.missing_vars", result.MissingVars))
	}

	// A rule may set only one of the two, so the other half still comes from
	// the channel.
	body := strings.Join(nonEmpty(result.Body), "\n\n")
	if customBody == "" {
		body, err = n.renderChannelTemplate(ctx, as)
		if err != nil {
			return "", err
		}
	} else {
		body, err = n.renderRuleTemplate(body)
		if err != nil {
			return "", err
		}
	}

	if result.Title == "" {
		return body, nil
	}

	title, err := n.renderRuleTemplate(result.Title)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace("<b>" + title + "</b>\n\n" + body), nil
}

// renderChannelTemplate reproduces upstream's rendering, including its choice
// of engine under parse_mode HTML: html/template escapes every interpolated
// value, so a channel template that does not pipe through html still sends.
func (n *Notifier) renderChannelTemplate(ctx context.Context, as []*types.Alert) (string, error) {
	var tmplErr error
	data := notify.GetTemplateData(ctx, n.tmpl, as, n.logger)

	message := notify.TmplHTML(n.tmpl, data, &tmplErr)(n.conf.Message)
	if tmplErr != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute telegram message template: %s", tmplErr.Error())
	}

	return message, nil
}

// renderRuleTemplate converts the templater's output from markdown, which is
// the format rule templates are authored in for every channel, into Telegram's
// HTML subset. The renderer escapes as it goes, so a stray < or & in an alert
// value cannot fail the send with "can't parse entities".
func (n *Notifier) renderRuleTemplate(markdown string) (string, error) {
	rendered, err := markdownrenderer.RenderTelegramHTML(markdown)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(rendered), nil
}

func (n *Notifier) getBotToken() (string, error) {
	if n.conf.BotTokenFile == "" {
		return string(n.conf.BotToken), nil
	}

	content, err := os.ReadFile(n.conf.BotTokenFile)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "could not read %s", n.conf.BotTokenFile)
	}

	return strings.TrimSpace(string(content)), nil
}

func (n *Notifier) getChatID() (int64, error) {
	if n.conf.ChatIDFile == "" {
		return n.conf.ChatID, nil
	}

	content, err := os.ReadFile(n.conf.ChatIDFile)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "could not read %s", n.conf.ChatIDFile)
	}

	chatID, err := strconv.ParseInt(strings.TrimSpace(string(content)), 10, 64)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "could not parse chat_id from %s", n.conf.ChatIDFile)
	}

	return chatID, nil
}

func nonEmpty(parts []string) []string {
	kept := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			kept = append(kept, part)
		}
	}

	return kept
}
