import React from 'react'

const Task = ({ task }) => {
  const onClick = () => {}
  return (
    <div className="mt-2 p-2 border flex flex-row gap-x-4 items-center">
      <div className="text-blue-600 font-bold">{task.title}</div>
      <div>{task.status}</div>
      <button
        type="button"
        onClick={() => onClick()}
        className="rounded-md py-2 px-4 bg-blue-500 text-white font-bold"
      >
        In progress
      </button>
    </div>
  )
}

Task.propTypes = {}

export default React.memo(Task)
