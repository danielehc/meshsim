# meshsim Makefile

BINARY  := meshsim
CMD     := ./cmd/meshsim
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X main.Version=$(VERSION)

.PHONY: build run fmt vet check dist clean help

## build: compile the binary (default)
build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) $(CMD)

## run: launch the scenario menu
run: build
	./run.sh

## fmt: format all Go source files
fmt:
	gofmt -w .

## vet: run go vet
vet:
	go vet ./...

## check: fmt + vet
check: fmt vet

## dist: cross-compile for all platforms into dist/
dist:
	mkdir -p dist
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-amd64        $(CMD)
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-arm64        $(CMD)
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-amd64       $(CMD)
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-arm64       $(CMD)
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-windows-amd64.exe  $(CMD)

## clean: remove built binary and dist/
clean:
	rm -f $(BINARY)
	rm -rf dist/

## help: print this help message
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## //'

.DEFAULT_GOAL := build
