#!/bin/bash

echo "Installing dependencies..."
npm install

echo ""
echo "Installing Python dependencies..."
pip install -r requirements.txt || pip3 install -r requirements.txt

echo ""
echo "Starting Media Downloader..."
echo ""
npm start

