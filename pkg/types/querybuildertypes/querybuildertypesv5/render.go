package querybuildertypesv5

// Renderer is the interface for rendering the result of a query.
type Renderer interface {
	Render(res Result) (any, error)
}
