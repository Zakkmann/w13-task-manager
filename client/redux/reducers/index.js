import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'
import auth from './auth'
import tasks from './tasks'

const createRootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    tasks,
    auth
  })

export default createRootReducer
