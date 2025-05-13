package querybuildertypesv5

type Renderer interface {
	Render(res Result) (any, error)
}
