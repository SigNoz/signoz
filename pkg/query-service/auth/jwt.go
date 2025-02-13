package auth

import (
	"time"
)

var (
	JwtSecret  string
	JwtExpiry  = 30 * time.Minute
	JwtRefresh = 30 * 24 * time.Hour
)
