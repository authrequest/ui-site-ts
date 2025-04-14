package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type Thumbnail struct {
	URL string `json:"url"`
}

type DisplayPrice struct {
	Amount   int    `json:"amount"`
	Currency string `json:"currency"`
}

type Variant struct {
	ID           string       `json:"id"`
	DisplayPrice DisplayPrice `json:"displayPrice"`
}

type Product struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	ShortDescription string    `json:"shortDescription"`
	Slug             string    `json:"slug"`
	Thumbnail        Thumbnail `json:"thumbnail"`
	Variants         []Variant `json:"variants"`
}

var products []Product

func loadProducts() error {
	data, err := ioutil.ReadFile("products.json")
	if err != nil {
		return err
	}

	err = json.Unmarshal(data, &products)
	if err != nil {
		return err
	}

	return nil
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(products)
}

func handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Send initial heartbeat
	heartbeat := map[string]string{"type": "heartbeat"}
	heartbeatData, _ := json.Marshal(heartbeat)
	w.Write([]byte("data: " + string(heartbeatData) + "\n\n"))
	flusher.Flush()

	// Send initial products
	update := map[string]interface{}{
		"type":     "update",
		"products": products,
	}
	updateData, _ := json.Marshal(update)
	w.Write([]byte("data: " + string(updateData) + "\n\n"))
	flusher.Flush()

	// Keep connection alive with periodic heartbeats
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			heartbeatData, _ := json.Marshal(heartbeat)
			w.Write([]byte("data: " + string(heartbeatData) + "\n\n"))
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func main() {
	// Load products from JSON file
	if err := loadProducts(); err != nil {
		log.Fatalf("Failed to load products: %v", err)
	}

	router := mux.NewRouter()

	// API routes
	router.HandleFunc("/api/products", getProducts).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/products/updates", handleSSE).Methods("GET")

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"}, // Vite default port
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Start server
	log.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", c.Handler(router)))
}
