package otelconfig

// converts string array to interface array
func StringsToIfaces(s []string) []interface{} {
	a := make([]interface{}, len(s))
	for i := range s {
		a[i] = s[i]
	}
	return a
}
