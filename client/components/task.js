import React from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'

import { setStatus } from '../redux/reducers/tasks'

const Task = ({ task }) => {
  const { category } = useParams()
  const dispatch = useDispatch()
  const onClick = (taskId, status) => {
    dispatch(setStatus(taskId, category, status))
  }

  return (
    <div className="mt-2 p-2 border flex flex-row gap-x-4 items-center">
      <div className="text-blue-600 font-bold">{task.title}</div>
      <div>{task.status}</div>
      {task.status === 'new' && <button
        type="button"
        onClick={() => onClick(task.taskId, 'in progress')}
        className="rounded-md py-2 px-4 bg-blue-500 text-white font-bold"
      >
        In progress
      </button>}
      {(task.status === 'in progress' || task.status === 'blocked') && <button
        type="button"
        onClick={() => onClick(task.taskId, task.status === 'blocked' ? 'in progress' : 'blocked')}
        className="rounded-md py-2 px-4 bg-blue-500 text-white font-bold"
      >
        Blocked
      </button>}
      {task.status === 'in progress' && <button
        type="button"
        onClick={() => onClick(task.taskId, 'done')}
        className="rounded-md py-2 px-4 bg-blue-500 text-white font-bold"
      >
        Done
      </button>}
    </div>
  )
}

Task.propTypes = {}

export default React.memo(Task)
