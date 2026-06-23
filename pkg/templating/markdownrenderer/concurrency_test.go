package markdownrenderer

import (
	"sync"
	"testing"
)

// TestConcurrentRender exercises every render entry point from many
// goroutines. Run with `go test -race` to catch shared-state regressions
// in the HTML, Block Kit or mrkdwn paths.
func TestConcurrentRender(t *testing.T) {
	const goroutines = 32
	const iterations = 20

	markdowns := []string{
		"# Heading\n\nparagraph **bold** *em* `code`",
		"- item 1\n- item 2\n  - nested\n- item 3",
		"| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |",
		"> quote\n>> nested quote",
		"```go\npackage main\n```",
		"[link](https://example.com) and ![img](https://example.com/i.png)",
	}

	renderers := map[string]func(string) (string, error){
		"html":     RenderHTML,
		"blockkit": RenderSlackBlockKit,
		"mrkdwn":   RenderSlackMrkdwn,
	}

	var wg sync.WaitGroup
	for name, render := range renderers {
		for g := 0; g < goroutines; g++ {
			wg.Add(1)
			go func(name string, render func(string) (string, error), g int) {
				defer wg.Done()
				for i := 0; i < iterations; i++ {
					md := markdowns[(g+i)%len(markdowns)]
					if _, err := render(md); err != nil {
						t.Errorf("%s render failed: %v", name, err)
						return
					}
				}
			}(name, render, g)
		}
	}
	wg.Wait()
}
