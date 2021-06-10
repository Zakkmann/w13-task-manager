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

const { readFile, writeFile } = require('fs').promises
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

function writeTask(category, list) {
  writeFile(`${__dirname}/data/${category}.json`, JSON.stringify(list), 'utf8')
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
  const data = await readFile(`${__dirname}/data/${category}.json`, { encoding: 'utf8' })
    .then((result) => {
      const del = '_isDeleted'
      return JSON.parse(result)
        .filter((task) => !task[del])
        .map((filteredTask) => {
          return Object.keys(filteredTask).reduce((acc, rec) => {
            if (rec[0] !== '_') {
              return { ...acc, [rec]: filteredTask[rec] }
            }
            return acc
          }, {})
        })
    })
    .catch(() => [])
  res.json(data)
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
  readFile(`${__dirname}/data/${category}.json`, 'utf8')
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
    await readFile(`${__dirname}/data/${category}.json`, 'utf8')
      .then((result) => {
        const updatedTaskList = JSON.parse(result).map((task) => {
          if (task.taskId === id) {
            updatedTask = { ...task, status }
            return updatedTask
          }
          return task
        })
        writeTask(category, updatedTaskList)
      })
      .catch((err) => err)
    res.json(updatedTask)
  } else {
    res.status(501).json({
      status: 'error',
      message: 'incorrect status'
    })
  }
})

server.delete('/api/v1/tasks/:category/:id', async (req, res) => {
  const { category, id } = req.params
  await readFile(`${__dirname}/data/${category}.json`, 'utf8')
    .then((result) => {
      const tasksList = JSON.parse(result).map((task) => {
        if (task.taskId === id) {
          return { ...task, _isDeleted: true, _deletedAt: +new Date() }
        }
        return task
      })
      writeTask(category, tasksList)
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
