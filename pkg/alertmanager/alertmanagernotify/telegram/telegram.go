// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2022 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

// Package telegram delivers alerts to a Telegram chat. It follows upstream's
// notifier for everything about the transport and adds the channel title and
// the per-rule title and body templates carried on the _title_template and
// _body_template annotations.
package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
)

const (
	Integration = "telegram"

	// Telegram supports 4096 chars max - from https://limits.tginfo.me/en.
	maxMessageLenRunes = 4096

	parseModeHTML = "HTML"
)

type Notifier struct {
	conf      *alertmanagertypes.TelegramReceiverConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

func New(conf *alertmanagertypes.TelegramReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "telegram http_config is nil")
	}

	if conf.APIUrl == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "telegram api_url is nil")
	}

	// Rendering targets the HTML subset only. A receiver stored through the v1
	// API can still carry another mode; failing here would fail the whole org's
	// config, so the send is forced to HTML instead.
	if conf.ParseMode != parseModeHTML {
		l.WarnContext(context.Background(), "telegram parse_mode is not supported, sending as HTML", slog.String("parse_mode", conf.ParseMode))
		htmlConf := *conf
		htmlConf.ParseMode = parseModeHTML
		conf = &htmlConf
	}

	httpclient, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		conf:      conf,
		tmpl:      t,
		logger:    l,
		client:    httpclient,
		retrier:   &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
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

	chatID, err := n.getChatID()
	if err != nil {
		return true, err
	}

	buf, err := n.encodeSendMessage(chatID, messageText)
	if err != nil {
		return false, err
	}

	resp, err := notify.PostJSON(ctx, n.client, n.conf.APIUrl.String()+"/bot"+botToken+"/sendMessage", buf) //nolint:bodyclose
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}

// encodeSendMessage builds the sendMessage payload with every value as a
// string, the encoding upstream's telebot client uses.
func (n *Notifier) encodeSendMessage(chatID int64, text string) (*bytes.Buffer, error) {
	params := map[string]string{
		"chat_id":                  strconv.FormatInt(chatID, 10),
		"text":                     text,
		"parse_mode":               n.conf.ParseMode,
		"disable_web_page_preview": "true",
	}
	if n.conf.DisableNotifications {
		params["disable_notification"] = "true"
	}
	if n.conf.MessageThreadID != 0 {
		params["message_thread_id"] = strconv.Itoa(n.conf.MessageThreadID)
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(params); err != nil {
		return nil, err
	}

	return &buf, nil
}

// buildMessage sends the title in bold above the message. Each half comes from
// the rule's template when it has one and from the channel's otherwise; an
// empty title sends the message alone.
func (n *Notifier) buildMessage(ctx context.Context, logger *slog.Logger, as []*types.Alert) (string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)

	var result *alertmanagertypes.ExpandResult
	if customTitle != "" || customBody != "" {
		var err error
		result, err = n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
			TitleTemplate: customTitle,
			BodyTemplate:  customBody,
		}, as)
		if err != nil {
			return "", err
		}

		if len(result.MissingVars) > 0 {
			logger.WarnContext(ctx, "unresolved variables in rule template", slog.Any("template_missing_vars", result.MissingVars))
		}
	}

	var (
		title, body string
		err         error
	)
	if customTitle != "" {
		title, err = n.renderRuleTemplate(result.Title)
	} else {
		title, err = n.renderChannelTemplate(ctx, as, n.conf.Title)
	}
	if err != nil {
		return "", err
	}

	if customBody != "" {
		body, err = n.renderRuleTemplate(strings.Join(nonEmpty(result.Body), "\n\n"))
	} else {
		body, err = n.renderChannelTemplate(ctx, as, n.conf.Message)
	}
	if err != nil {
		return "", err
	}

	if title == "" {
		return body, nil
	}

	return strings.TrimSpace("<b>" + title + "</b>\n\n" + body), nil
}

// renderChannelTemplate reproduces upstream's rendering, including its choice
// of engine under parse_mode HTML: html/template escapes every interpolated
// value, so a channel template that does not pipe through html still sends.
func (n *Notifier) renderChannelTemplate(ctx context.Context, as []*types.Alert, text string) (string, error) {
	if text == "" {
		return "", nil
	}

	var tmplErr error
	data := notify.GetTemplateData(ctx, n.tmpl, as, n.logger)

	rendered := notify.TmplHTML(n.tmpl, data, &tmplErr)(text)
	if tmplErr != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute telegram template: %s", tmplErr.Error())
	}

	return strings.TrimSpace(rendered), nil
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
