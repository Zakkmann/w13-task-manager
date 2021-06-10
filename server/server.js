import express from 'express'
import path from 'path'
import cors from 'cors'
import sockjs from 'sockjs'
import { renderToStaticNodeStream } from 'react-dom/server'
import React from 'react'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'

import config from './config'
import Html from '../client/html'

const { readFile, writeFile, readdir } = require('fs').promises
require('colors')

let Root
try {
  // eslint-disable-next-line import/no-unresolved
  Root = require('../dist/assets/js/ssr/root.bundle').default
} catch {
  console.log('SSR not found. Please run "yarn run build:ssr"'.red)
}

let connections = []

const port = process.env.PORT || 8090
const server = express()

const newTaskTemplate = {
  taskId: 'id',
  title: 'Title',
  status: 'new',
  _isDeleted: false,
  _createdAt: null,
  _deletedAt: null
}

const statusList = ['done', 'new', 'in progress', 'blocked']
const timeSpans = {
  day: 1000 * 60 * 60 * 24,
  week: 7 * 1000 * 60 * 60 * 24,
  month: 30 * 1000 * 60 * 60 * 24
}

function writeTask(category, list) {
  writeFile(`${__dirname}/data/${category}.json`, JSON.stringify(list), 'utf8')
}

function getCategoryFile(category) {
  return readFile(`${__dirname}/data/${category}.json`, 'utf8')
}

function updateTaskList(taskListString = '[]', id = 'id', category = '', payload = {}) {
  let updatedTask = {}
  const updatedList = JSON.parse(taskListString).map((task) => {
    if (task.taskId === id) {
      updatedTask = { ...task, ...payload }
      return updatedTask
    }
    return task
  })
  writeTask(category, updatedList)
  return {
    list: updatedList, // Это не используется в коде, нигде. Потому что.
    task: updatedTask
  }
}

function removeTechFields(filteredTask) {
  return Object.keys(filteredTask).reduce((acc, rec) => {
    if (rec[0] !== '_') {
      return { ...acc, [rec]: filteredTask[rec] }
    }
    return acc
  }, {})
}

const middleware = [
  cors(),
  express.static(path.resolve(__dirname, '../dist/assets')),
  express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }),
  express.json({ limit: '50mb', extended: true }),
  cookieParser()
]

middleware.forEach((it) => server.use(it))

server.get('/api/v1/tasks/:category', async (req, res) => {
  const { category } = req.params
  const data = await getCategoryFile(category)
    .then((result) => {
      const del = '_isDeleted'
      return JSON.parse(result)
        .filter((task) => !task[del])
        .map((filteredTask) => {
          return removeTechFields(filteredTask)
        })
    })
    .catch(() => [])
  res.json(data)
})

server.get('/api/v1/tasks/:category/:timespan', async (req, res) => {
  const { category, timespan } = req.params
  const data = await getCategoryFile(category)
    .then((result) => {
      const del = '_isDeleted'
      const crtAt = '_createdAt'
      return JSON.parse(result)
        .filter((task) => !task[del] && task[crtAt] + timeSpans[timespan] > +new Date())
        .map((filteredTask) => {
          return removeTechFields(filteredTask)
        })
    })
    .catch(() => [])
  res.json(data)
})

server.get('/api/v1/categories', async (req, res) => {
  const categories = await readdir(`${__dirname}/data`)
  const filteredCategories = categories.reduce((acc, cat) => {
    if (cat[0] !== '.') {
      return [...acc, cat.slice(0, -5)]
    }
    return acc
  }, [])
  res.json(filteredCategories)
})

server.post('/api/v1/tasks/:category', (req, res) => {
  const { category } = req.params
  const { title } = req.body
  const newTask = {
    ...newTaskTemplate,
    title,
    taskId: nanoid(),
    _createdAt: +new Date()
  }
  getCategoryFile(category)
    .then((result) => {
      const taskList = JSON.parse(result)
      writeTask(category, [...taskList, newTask])
    })
    .catch(() => {
      writeTask(category, [newTask])
    })
  res.send('Task added')
})

server.patch('/api/v1/tasks/:category/:id', async (req, res) => {
  const { category, id } = req.params
  const { status } = req.body
  if (statusList.includes(status)) {
    let updatedTask = {}
    await getCategoryFile(category)
      .then((result) => {
        updatedTask = updateTaskList(result, id, category, { status }).task
      })
      .catch((err) => err)
    res.json(removeTechFields(updatedTask))
  } else {
    res.status(501).json({
      status: 'error',
      message: 'incorrect status'
    })
  }
})

server.delete('/api/v1/tasks/:category/:id', async (req, res) => {
  const { category, id } = req.params
  await getCategoryFile(category)
    .then((result) => {
      return updateTaskList(result, id, category, {
        _isDeleted: true,
        _deletedAt: +new Date()
      })
    })
    .catch((err) => err)
  res.send('Task deleted')
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const [htmlStart, htmlEnd] = Html({
  body: 'separator',
  title: 'Skillcrucial'
}).split('separator')

server.get('/', (req, res) => {
  const appStream = renderToStaticNodeStream(<Root location={req.url} context={{}} />)
  res.write(htmlStart)
  appStream.pipe(res, { end: false })
  appStream.on('end', () => {
    res.write(htmlEnd)
    res.end()
  })
})

server.get('/*', (req, res) => {
  const appStream = renderToStaticNodeStream(<Root location={req.url} context={{}} />)
  res.write(htmlStart)
  appStream.pipe(res, { end: false })
  appStream.on('end', () => {
    res.write(htmlEnd)
    res.end()
  })
})

const app = server.listen(port)

if (config.isSocketsEnabled) {
  const echo = sockjs.createServer()
  echo.on('connection', (conn) => {
    connections.push(conn)
    conn.on('data', async () => {})

    conn.on('close', () => {
      connections = connections.filter((c) => c.readyState !== 3)
    })
  })
  echo.installHandlers(app, { prefix: '/ws' })
}
console.log(`Serving at http://localhost:${port}`)
