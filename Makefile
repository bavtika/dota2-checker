.PHONY: install lint test start docker-build docker-up docker-down ci

install:
	npm ci

lint:
	npm run lint

test:
	npm test

start:
	npm start

docker-build:
	docker build -t dota2-checker:local .

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

ci: lint test docker-build
