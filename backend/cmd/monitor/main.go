package main

import (
	"all-unifi-monitor/internal/config"
	"all-unifi-monitor/internal/server"
	"all-unifi-monitor/internal/store"
	"all-unifi-monitor/pkg/logger"
	"net/http"
	"os"
)

func main() {
	logger.Info().Msg("Initializing...")

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Initialize store
	unifiStore := store.New(cfg)
	go unifiStore.Start()

	// Initialize HTTP server
	server := server.NewServer(unifiStore)

	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	logger.Info().Str("port", port).Msg("Starting server...")
	if err := http.ListenAndServe(":"+port, server); err != nil {
		logger.Fatal().Err(err).Msg("Failed to start server")
	}
}
