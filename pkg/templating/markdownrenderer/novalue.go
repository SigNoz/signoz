package markdownrenderer

import (
	"github.com/yuin/goldmark"
	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/util"
)

// Go text/template writes the literal string "<no value>" when a referenced
// key is missing. The default goldmark HTML path treats it as raw HTML and
// drops it, hiding the missing value. This renderer escapes it so operators
// can see which variable was unset in the rendered notification.
type noValueHTMLRenderer struct {
	html.Config
}

func newNoValueHTMLRenderer(opts ...html.Option) renderer.NodeRenderer {
	r := &noValueHTMLRenderer{Config: html.NewConfig()}
	for _, opt := range opts {
		opt.SetHTMLOption(&r.Config)
	}
	return r
}

func (r *noValueHTMLRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	reg.Register(gast.KindRawHTML, r.renderRawHTML)
}

func (r *noValueHTMLRenderer) renderRawHTML(w util.BufWriter, source []byte, node gast.Node, entering bool) (gast.WalkStatus, error) {
	if !entering {
		return gast.WalkSkipChildren, nil
	}
	n := node.(*gast.RawHTML)
	if r.Unsafe {
		for i := 0; i < n.Segments.Len(); i++ {
			segment := n.Segments.At(i)
			_, _ = w.Write(segment.Value(source))
		}
		return gast.WalkSkipChildren, nil
	}
	if string(n.Segments.Value(source)) == "<no value>" {
		_, _ = w.WriteString("&lt;no value&gt;")
		return gast.WalkSkipChildren, nil
	}
	_, _ = w.WriteString("<!-- raw HTML omitted -->")
	return gast.WalkSkipChildren, nil
}

type escapeNoValueExtension struct{}

// escapeNoValue renders the literal `<no value>` produced by Go's text/template
// as visible escaped text instead of dropping it as raw HTML.
var escapeNoValue = &escapeNoValueExtension{}

func (e *escapeNoValueExtension) Extend(m goldmark.Markdown) {
	m.Renderer().AddOptions(renderer.WithNodeRenderers(
		util.Prioritized(newNoValueHTMLRenderer(), 500),
	))
}
