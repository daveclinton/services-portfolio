# Build a static binary, then ship it in a tiny image with no shell.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
RUN mkdir -p /licenses && \
    cp "$(go list -m -f '{{.Dir}}' github.com/yuin/goldmark)/LICENSE" /licenses/goldmark.txt && \
    cp "$(go list -m -f '{{.Dir}}' golang.org/x/oauth2)/LICENSE" /licenses/oauth2.txt
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /portfolio-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /portfolio-api /portfolio-api
COPY internal/sendy/templates/LICENSE /licenses/postmark-templates.txt
COPY --from=build /licenses /licenses
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/portfolio-api"]
