import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Head from './head'
import Task from './task'
import { getTaskFromServer } from '../redux/reducers/tasks'

const Category = () => {
  const dispatch = useDispatch()
  const { tasks } = useSelector((store) => store.tasks)
  const { category } = useParams()

  useEffect(() => {
    dispatch(getTaskFromServer(category))
  }, [category])
  return (
    <div>
      <Head title="Category" />
      <div>Category: {category}</div>
      <div>
        {Object.keys(tasks).map((id) => {
          return <Task key={id} task={tasks[id]} />
        })}
      </div>
    </div>
  )
}

Category.propTypes = {}

export default React.memo(Category)
