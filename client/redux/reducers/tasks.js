const GET_TASKS = 'task-manager/tasks/GET_TASKS'

const initialState = {
  tasks: {}
}

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_TASKS: {
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
