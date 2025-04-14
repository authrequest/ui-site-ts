package server

import (
	"all-unifi-monitor/internal/models"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type Server struct {
	router *mux.Router
	store  models.Store
}

func NewServer(store models.Store) *Server {
	s := &Server{
		router: mux.NewRouter(),
		store:  store,
	}

	// Setup routes
	s.router.HandleFunc("/api/products", s.getProducts).Methods("GET")
	s.router.HandleFunc("/api/products/updates", s.handleSSE).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	})

	s.router.Use(c.Handler)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) getProducts(w http.ResponseWriter, r *http.Request) {
	products := s.store.GetProducts()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	products := s.store.GetProducts()
	update := map[string]interface{}{
		"type":     "update",
		"products": products,
	}
	updateData, _ := json.Marshal(update)
	w.Write([]byte("data: " + string(updateData) + "\n\n"))
	flusher.Flush()
}
