@echo off
echo Starting local server with Python...
echo Access the site at: http://127.0.0.1:8000
echo Close this window to stop the server.
start http://127.0.0.1:8000
python admin_server.py
pause
