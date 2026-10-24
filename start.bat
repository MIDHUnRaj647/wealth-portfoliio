@echo off
title MI-AS Wealth Local Server
echo Starting MI-AS Wealth Local Auto-Save Server...
start "" http://localhost:3000
node server.js
pause
