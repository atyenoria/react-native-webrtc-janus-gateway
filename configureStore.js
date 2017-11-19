
'use_strict'

import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { persistStore, autoRehydrate } from 'redux-persist';
import { AsyncStorage } from 'react-native';

import reducer from './reducers';

// import { createLogger } from 'redux-logger';
import {createLogger} from 'redux-logger';



const middlewares = [ thunk ];

if (__DEV__ === true) {
  middlewares.push(createLogger({}));
}

const createStoreWithMiddleware = applyMiddleware(...middlewares)(createStore);

function configureStore(onComplete: Function) {
  
  const store = autoRehydrate()(createStoreWithMiddleware)(reducer);
  persistStore(store, {storage: AsyncStorage}, onComplete);
  
  return store;
}


export default configureStore;