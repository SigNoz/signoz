package ruletypes

var CustomTemplatingAnnotations = []string{
	AnnotationTitleTemplate,
	AnnotationBodyTemplate,
}

// IsCustomTemplatingAnnotation checks if the given annotation is a custom templating annotation
// in order to avoid expanding them in the rule manager layer.
func IsCustomTemplatingAnnotation(name string) bool {
	for _, annotation := range CustomTemplatingAnnotations {
		if annotation == name {
			return true
		}
	}
	return false
}
