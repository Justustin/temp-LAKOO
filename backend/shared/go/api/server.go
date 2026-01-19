package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

type ServerConfig struct {
	Addr        string
	DB          *gorm.DB
	ServiceName string
	APIPrefix   string
}

type Server struct {
	config ServerConfig
	router *mux.Router
}

func NewServer(config ServerConfig) *Server {
	router := mux.NewRouter()
	return &Server{
		config: config,
		router: router,
	}
}

func (s *Server) RegisterRoutes(registerFunc func(*mux.Router)) {
	subrouter := s.router.PathPrefix(fmt.Sprintf("/api%s", s.config.APIPrefix)).Subrouter()

	registerFunc(subrouter)
}

func (s *Server) Start() error {
	fmt.Printf("Starting %s at port: %v\n", s.config.ServiceName, s.config.Addr)
	return http.ListenAndServe(s.config.Addr, s.router)
}
