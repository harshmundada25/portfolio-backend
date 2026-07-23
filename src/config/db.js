import mongoose from "mongoose";

const INITIAL_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;

let connectPromise = null;
let reconnectTimer = null;
let retryCount = 0;
let connectionListenersRegistered = false;

const getRetryDelay = () => {
  const exponent = Math.min(retryCount, 5);
  return Math.min(INITIAL_RETRY_DELAY_MS * (2 ** exponent), MAX_RETRY_DELAY_MS);
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = (reason) => {
  if (reconnectTimer || connectPromise || mongoose.connection.readyState === 1) {
    return;
  }

  const delay = getRetryDelay();
  console.warn(`[MongoDB] ${reason}. Retrying in ${delay}ms.`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectDB("retry");
  }, delay);
};

const registerConnectionListeners = () => {
  if (connectionListenersRegistered) {
    return;
  }

  connectionListenersRegistered = true;

  mongoose.connection.on("connected", () => {
    retryCount = 0;
    clearReconnectTimer();
    console.log("✅ MongoDB Connected");
  });

  mongoose.connection.on("reconnected", () => {
    retryCount = 0;
    clearReconnectTimer();
    console.log("✅ MongoDB Reconnected");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
    scheduleReconnect("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("❌ MongoDB connection error:", error.message);
    if (mongoose.connection.readyState !== 1) {
      scheduleReconnect(error.message);
    }
  });
};

const connectDB = async (reason = "initial") => {
  registerConnectionListeners();

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set");
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  retryCount += 1;
  console.log(`[MongoDB] Connection attempt ${retryCount} (${reason})`);

  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
  };

  connectPromise = mongoose.connect(process.env.MONGO_URI, options);

  try {
    await connectPromise;
    retryCount = 0;
    return mongoose.connection;
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    return null;
  } finally {
    connectPromise = null;
    if (mongoose.connection.readyState !== 1) {
      scheduleReconnect("MongoDB unavailable");
    }
  }
};

export default connectDB;
