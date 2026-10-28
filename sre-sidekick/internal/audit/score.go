package audit

func score(findings []Finding) float64 {
	value := 100.0
	for _, finding := range findings {
		if finding.Status != Fail {
			continue
		}
		switch finding.Severity {
		case "blocker":
			value -= 15
		case "warning":
			value -= 5
		case "info":
			value -= 1
		}
	}
	if value < 0 {
		return 0
	}
	return value
}
