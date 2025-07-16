@echo off
title 启动竞拍系统 + Ngrok 映射

echo 启动本地服务器...
start cmd /k "cd /d E:\MyAuctionProject && node server.js"

timeout /t 3 >nul

echo 启动 Ngrok 映射...
start cmd /k "E:\ngrok\ngrok.exe http 3000"

echo =============================
echo ✅ 竞拍系统已启动！
echo 浏览地址稍后会显示在 ngrok 窗口
echo =============================
pause
