@echo off
docker compose down 2>nul
docker compose up --build %*
