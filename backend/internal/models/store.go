package models

type Store interface {
	GetProducts() []Product
	Start()
}
