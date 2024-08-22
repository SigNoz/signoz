package version

import (
	"fmt"
	"runtime"
	"strings"
)

// This is set via ldflags at build time.
var (
	name    string = "-------"
	version string = "-------"
	hash    string = "-------"
	time    string = "-------"
	branch  string = "-------"
	Info    Build  = Build{
		Name:      name,
		Version:   version,
		Hash:      hash,
		Time:      time,
		Branch:    branch,
		GoVersion: runtime.Version(),
	}
)

// Build contains information about the build environment.
type Build struct {
	// The name of the current build.
	Name string
	// The version of the current build.
	Version string
	// The git hash of the current build.
	Hash string
	// The time of the current build.
	Time string
	// The branch of the current build.
	Branch string
	// The version of go.
	GoVersion string
}

func (b Build) PrettyPrint() {
	ascii := []string{
		"                       -**********=                        ",
		"                  .::-=+**********+=--:.                   ",
		"              .-=*******++=-----==+******=-.               ",
		"           :-+*******=:.            :-+******=:            ",
		"        .-********+:                   .=*******=.         ",
		"      :+********+:                       .=*******+:       ",
		"    .+*********+   :+***+.                 -********+:     ",
		"   -**********+.  .****=                    =*********=    ",
		" .************:   +****                      +**********:  ",
		".************+   .----:                      -***********- ",
		"*************=                               :************.",
		":************+    ----:                      -***********= ",
		" :************.   *****                      +**********:  ",
		"  .=**********+   :****=                    -*********+.   ",
		"    :+*********+   :+***+                  -********+:     ",
		"      :+********+.                        =*******+-       ",
		"        :=********=.                    -*******=:         ",
		"           :=*******+-.             .-+******=-.           ",
		"              :-+*******+=--:::--=+******+=:               ",
		"                  .:-==+***********+=-::                   ",
		"                       :**********=                        ",
	}

	fields := []struct {
		key   string
		value string
	}{
		{"Name", b.Name},
		{"Version", b.Version},
		{"Commit Hash", b.Hash},
		{"Commit Time", b.Time},
		{"Branch", b.Branch},
		{"Go Version", b.GoVersion},
	}

	maxKeyLength := 0
	for _, field := range fields {
		if len(field.key) > maxKeyLength {
			maxKeyLength = len(field.key)
		}
	}

	maxAsciiWidth := 0
	for _, line := range ascii {
		if len(line) > maxAsciiWidth {
			maxAsciiWidth = len(line)
		}
	}

	panelWidth := maxKeyLength + 30 // Adjust this value to change panel width

	fmt.Println()

	for i, line := range ascii {
		fmt.Print(line)
		fmt.Print("    ")
		if i == 0 || i == 2 {
			fmt.Printf("%s\n", strings.Repeat("-", panelWidth))
			continue
		}
		if i == 1 {
			txt := "Starting SigNoz"
			fmt.Printf("| %-*s |\n", panelWidth-4, txt)
			continue
		}
		if i-3 >= 0 && i-3 < len(fields) {
			field := fields[i-3]
			fmt.Printf("| %-*s : %-*s |", maxKeyLength, field.key, panelWidth-maxKeyLength-7, field.value)
		} else if i == len(fields)+3 {
			fmt.Print(strings.Repeat("-", panelWidth))
		} else if i > 2 && i < len(fields)+4 {
			fmt.Printf("|%-*s|", panelWidth-2, "")
		}
		fmt.Println()
	}

	fmt.Println()

	// for i := 0; i < len(ascii); i++ {
	// 	if i < len(fields) {
	// 		fmt.Printf("%-9s %-*s : %s\n", ascii[i], maxKeyLength, fields[i].key, fields[i].value)
	// 	} else {
	// 		fmt.Printf("%-9s\n", ascii[i])
	// 	}
	// }

	// // Print remaining fields if any
	// for i := len(ascii); i < len(fields); i++ {
	// 	fmt.Printf("%9s %-*s : %s\n", "", maxKeyLength, fields[i].key, fields[i].value)
	// }

	// fmt.Printf("\n")
}
