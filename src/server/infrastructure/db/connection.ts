import mongoose, {Mongoose} from 'mongoose';
import {getEnv} from '@/server/config/env';

interface CachedMongoose {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

declare global {
    var mongoose: CachedMongoose | undefined;
}

global.mongoose = global.mongoose || {conn: null, promise: null};

const cached: CachedMongoose = global.mongoose;

async function dbConnect(): Promise<Mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(getEnv().mongodbUri);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
