import mongoose, {Mongoose} from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/scheduler';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Cached connection for MongoDB.
 */
interface CachedMongoose {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

// Ensure global object for caching
declare global {
    // eslint-disable-next-line no-var
    var mongoose: CachedMongoose | undefined;
}

// Initialize cache if not already set
global.mongoose = global.mongoose || {conn: null, promise: null};

const cached: CachedMongoose = global.mongoose;

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
