// MongoDB initialisation script — runs inside mongosh at first container start.
// IMPORTANT: process.env is NOT available here.
// Set MONGO_APP_PASSWORD via docker-compose environment or a secrets manager,
// then rebuild the container.  The password below is the DOCKER default only.
// For production, replace this file with a secrets-injected init script or
// use MongoDB Atlas which handles user creation for you.

const APP_PASSWORD = 'AppPassword_ChangeMe_In_Production!';

db = db.getSiblingDB('vehicle_detection');

// Only create user if it doesn't already exist (idempotent)
const existingUser = db.getUser('platedetect_user');
if (!existingUser) {
  db.createUser({
    user: 'platedetect_user',
    pwd: APP_PASSWORD,
    roles: [
      { role: 'readWrite', db: 'vehicle_detection' },
      { role: 'dbAdmin', db: 'vehicle_detection' },
    ],
  });
  print('Created app DB user: platedetect_user');
} else {
  print('App DB user already exists, skipping creation.');
}

// Create indexes (idempotent)
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ apiKey: 1 }, { sparse: true });
db.detections.createIndex({ user: 1, createdAt: -1 });
db.detections.createIndex({ jobId: 1 }, { unique: true });
db.vehicles.createIndex({ plateNumber: 1, user: 1 });

print('MongoDB initialised successfully.');
