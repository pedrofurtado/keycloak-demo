//// VER ISSO: https://www.keycloak.org/docs/latest/securing_apps/index.html

const express = require('express')
const fetch = require("node-fetch")
const app = express()

const config = {
  realm: 'my-company',
  keycloak_public_url: 'https://4f43-177-33-138-202.ngrok-free.app',
  keycloak_docker_internal_url: 'https://4f43-177-33-138-202.ngrok-free.app',
  my_node_app_base_url: 'http://localhost:3000',
  client_id: 'my-node-app',
  client_secret: 'jLepuNGYIWYsEgblHXgq9G8W9qVnFv26'
}

app.get('/', (req, res) => {
  res.send('My node app for keycloak demo')
})

app.get('/login', (req, res) => {
  const loginParams = new URLSearchParams({
    client_id: config.client_id,
    client_secret: config.client_secret,
    redirect_uri: `${config.my_node_app_base_url}/callback`,
    response_type: 'code'
  })
  const url = `${config.keycloak_public_url}/realms/${config.realm}/protocol/openid-connect/auth?${loginParams.toString()}`
  res.redirect(url)
})

app.get('/callback', async (req, res) => {
  console.log(req.query)

  const bodyParams = new URLSearchParams({
    client_id: config.client_id,
    client_secret: config.client_secret,
    grant_type: 'authorization_code',
    code: req.query.code,
    redirect_uri: `${config.my_node_app_base_url}/callback`
  })

  const url = `${config.keycloak_docker_internal_url}/realms/${config.realm}/protocol/openid-connect/token`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  })

  const jsonResponse = await response.json()

  res.send({ query_string_parameters: req.query, response: { status_code: response.status, data: jsonResponse } })
})

app.listen(3000, () => {
  console.log('App my-node-app started')
})
