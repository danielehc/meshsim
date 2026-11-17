package store

import (
	"bufio"
	"math/rand"
	"os"
	"strings"
)

// Product holds a parsed product entry (name + icon).
type Product struct {
	Name string
	Icon string
}

// ProductStore holds a loaded list of products and can serve random ones.
type ProductStore struct {
	products []Product
}

// LoadProducts reads a pipe-delimited file: "Name | fa-icon".
// Ignores blank lines and lines starting with '#'.
func LoadProducts(path string) (*ProductStore, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var products []Product
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "|", 2)
		name := strings.TrimSpace(parts[0])
		icon := ""
		if len(parts) == 2 {
			icon = strings.TrimSpace(parts[1])
		}
		if icon == "" {
			icon = "fa-gear"
		}
		if name != "" {
			products = append(products, Product{Name: name, Icon: icon})
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return &ProductStore{products: products}, nil
}

// Random returns a random product, or a zero Product if the store is empty.
func (s *ProductStore) Random() Product {
	if len(s.products) == 0 {
		return Product{}
	}
	return s.products[rand.Intn(len(s.products))]
}

// Len returns the number of loaded products.
func (s *ProductStore) Len() int { return len(s.products) }
