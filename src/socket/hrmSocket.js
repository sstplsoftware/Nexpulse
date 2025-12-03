const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://crm-fft1.onrender.com",
      "http://crm-fft1.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"],   // IMPORTANT FOR RENDER
  allowEIO3: true                         // FIX compatibility issues
});
