const GET_TASKS = 'task-manager/tasks/GET_TASKS'
const CHANGE_STATUS = 'task-manager/tasks/CHANGE_STATUS'

const initialState = {
  tasks: {}
}

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_TASKS:
    case CHANGE_STATUS: {
      return {
        ...state,
        tasks: action.response
      }
    }
    default:
      return state
  }
}

export function getTaskFromServer(category) {
  return (dispatch) => {
    fetch(`/api/v1/tasks/${category}`)
      .then((result) => result.json())
      .then((array) =>
        array.reduce((acc, rec) => {
          return { ...acc, [rec.taskId]: rec }
        }, {})
      )
      .then((response) =>
        dispatch({
          type: GET_TASKS,
          response
        })
      )
      .catch((err) => {
        console.log(err)
      })
  }
}
// {id:{}} ...id.status
// const store = {
//   router: connectRouter(history),
//   tasks: {
//     tasks: {}
//   },
//   auth: {}
// }
export function setStatus(id, category, status) {
  return (dispatch, getState) => {
    const store = getState()
    const objRoot = store.tasks.tasks
    const changeStatusInProgress = {...objRoot, [id]: {...objRoot[id], status}}
    fetch(`/api/v1/tasks/${category}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status
      })
    })
      .then(() => {
        dispatch({
          type: CHANGE_STATUS,
          response: changeStatusInProgress
        })
      })
      .catch((err) => console.log(err))
  }
}
