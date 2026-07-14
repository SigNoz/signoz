package markdownrenderer

import (
	"bytes"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer/blockkit"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer/mrkdwn"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
)

// htmlRenderer is built once and shared. Goldmark's built-in HTML path and
// the novalue extension carry no mutable state, so a single goldmark.Markdown
// is safe to Convert concurrently.
var htmlRenderer = goldmark.New(goldmark.WithExtensions(extension.GFM, escapeNoValue))

// The Slack renderers hold per-document state on the node renderer (list
// context, table context, style stack, blockquote/list prefixes). Two
// goroutines calling Convert on the same goldmark.Markdown would corrupt
// that state. A sync.Pool gives each concurrent caller its own instance
// while still amortising the cost of building the pipeline.
var (
	blockkitPool = sync.Pool{
		New: func() any {
			return goldmark.New(goldmark.WithExtensions(blockkit.Extender))
		},
	}
	mrkdwnPool = sync.Pool{
		New: func() any {
			return goldmark.New(goldmark.WithExtensions(mrkdwn.Extender))
		},
	}
)

// RenderHTML converts markdown to HTML.
func RenderHTML(markdown string) (string, error) {
	return render(htmlRenderer, markdown, "HTML")
}

// RenderSlackBlockKit converts markdown to a Slack Block Kit JSON array.
func RenderSlackBlockKit(markdown string) (string, error) {
	md := blockkitPool.Get().(goldmark.Markdown)
	defer blockkitPool.Put(md)
	return render(md, markdown, "Slack Block Kit")
}

// RenderSlackMrkdwn converts markdown to Slack's mrkdwn format.
func RenderSlackMrkdwn(markdown string) (string, error) {
	md := mrkdwnPool.Get().(goldmark.Markdown)
	defer mrkdwnPool.Put(md)
	return render(md, markdown, "Slack mrkdwn")
}

func render(md goldmark.Markdown, markdown string, format string) (string, error) {
	var buf bytes.Buffer
	if err := md.Convert([]byte(markdown), &buf); err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to convert markdown to %s", format)
	}
	return buf.String(), nil
}
