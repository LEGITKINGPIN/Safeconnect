# SafeConnect

> 🟢 **LIVE DEMO**: [Click here to join the live session!](https://vid-seasons-regulated-trademark.trycloudflare.com/)

A modern, production-ready anonymous chat platform inspired by Omegle, but designed with a focus on safety, AI moderation, and user privacy.

## ✨ Features

- 🤝 **Anonymous Matching**: Connect with "Strangers" based on shared interests or randomly.
- 📹 **Video & Text Chat**: High-quality P2P Video (WebRTC) and real-time Text chat.
- 🤖 **AI-Moderation**: Real-time content scanning for messages to prevent abuse and toxicity using Google Gemini AI.
- 🛡️ **Safety Mode**: Video is blurred by default until both users consent.
- 🔞 **Onboarding**: Mandatory age verification and interest-based tailoring.
- 📱 **Modern UI**: Dark mode, responsive design, and smooth animations powered by Framer Motion.

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, motion, Zustand, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io (Matchmaking & Signaling).
- **AI**: Google Gemini API (@google/genai).
- **Communication**: WebRTC (P2P) + WebSockets.

## 🚀 Setup & Deployment

### Environment Variables
The following must be configured in your environment:
- `GEMINI_API_KEY`: Your Google Gemini API Key.

### Development
1. `npm install`
2. `npm run dev`

### Production
The server runs on port 3000.
1. `npm run build`
2. `npm start`

## 🔒 Privacy & Moderation
- We do not store chat logs.
- Matching is handled in memory on the server.
- Moderation relies on cutting-edge LLMs to determine safe/unsafe content locally before transmission.
