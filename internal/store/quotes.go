package store

import (
	"bufio"
	"math/rand"
	"os"
	"strings"
)

// QuoteStore holds a loaded list of quotes and can serve random ones.
type QuoteStore struct {
	quotes []string
}

// LoadQuotes reads a text file; ignores blank lines and lines starting with '#'.
func LoadQuotes(path string) (*QuoteStore, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var quotes []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		quotes = append(quotes, line)
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return &QuoteStore{quotes: quotes}, nil
}

// Random returns a random quote, or "" if the store is empty.
func (s *QuoteStore) Random() string {
	if len(s.quotes) == 0 {
		return ""
	}
	return s.quotes[rand.Intn(len(s.quotes))]
}

// Len returns the number of loaded quotes.
func (s *QuoteStore) Len() int { return len(s.quotes) }
