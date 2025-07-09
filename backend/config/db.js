const mongoose = require("mongoose");
const colors = require("colors");

const connectDB = async () => {
  try {
    // Set Mongoose options for better performance and connection stability
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB'.green);
    });
    
    mongoose.connection.on('error', (err) => {
      console.log(`Mongoose connection error: ${err}`.red);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB'.yellow);
    });
    
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`.red.bold);
    console.error('Retrying connection in 5 seconds...'.yellow);
    setTimeout(connectDB, 5000);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination'.cyan);
    process.exit(0);
  } catch (error) {
    console.error('Error during MongoDB disconnection:', error);
    process.exit(1);
  }
});

module.exports = connectDB;

