package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
)

type Product struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	ShortDescription string `json:"shortDescription"`
	Slug             string `json:"slug"`
	Thumbnail        struct {
		URL string `json:"url"`
	} `json:"thumbnail"`
	Variants []struct {
		ID           string `json:"id"`
		DisplayPrice struct {
			Amount   int    `json:"amount"`
			Currency string `json:"currency"`
		} `json:"displayPrice"`
	} `json:"variants"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow GET requests
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read products.json
	productsPath := filepath.Join("backend", "products.json")
	data, err := os.ReadFile(productsPath)
	if err != nil {
		http.Error(w, "Failed to read products data", http.StatusInternalServerError)
		return
	}

	// Parse JSON
	var products []Product
	if err := json.Unmarshal(data, &products); err != nil {
		http.Error(w, "Failed to parse products data", http.StatusInternalServerError)
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")

	// Return products as JSON
	if err := json.NewEncoder(w).Encode(products); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
