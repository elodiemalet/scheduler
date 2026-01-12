import {configureStore} from '@reduxjs/toolkit';
import storage from "redux-persist/lib/storage";

import {persistReducer, persistStore} from "redux-persist";

const rootReducer = (state = {}) => state;

const persistConfig = {
    key: "root",
    storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configuration du store
const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
            },
        }),
});
const persistor = persistStore(store)

export {store, persistor};

