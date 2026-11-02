# Build a static binary, then ship it in a tiny image with no shell.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /portfolio-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /portfolio-api /portfolio-api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/portfolio-api"]
