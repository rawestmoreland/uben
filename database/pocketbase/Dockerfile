# Build stage
FROM golang:1.27.0-alpine AS builder

# Set working directory for the build
WORKDIR /build

# Install necessary build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy the Go project from ./base directory
COPY ./base /build

# Download Go dependencies
RUN go mod download

# Build the application
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o pocketbase .

# Final stage - similar to your original Dockerfile
FROM alpine:latest

# Install necessary runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create app directory
RUN mkdir -p /pb/pb_data /pb/pb_public /pb/pb_migrations

# Copy the compiled binary from the builder stage
COPY --from=builder /build/pocketbase /pb/

# Static pages served at the site root (password reset page)
COPY --from=builder /build/pb_public /pb/pb_public

# Set proper permissions
RUN chmod +x /pb/pocketbase

# main.go serves ./pb_public, so the working directory must be /pb
WORKDIR /pb

# Expose the port
EXPOSE 8080

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]