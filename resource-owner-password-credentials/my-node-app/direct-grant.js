//// VER ISSO: https://www.keycloak.org/docs/latest/securing_apps/index.html

const express = require('express')
const session = require("express-session")
const fetch = require("node-fetch")
const app = express()

app.use(express.urlencoded({ extended: true }));

const memoryStore = new session.MemoryStore();

app.use(
  session({
    secret: "my-secret",
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
    //expires
  })
);

const config = {
  realm: 'my-company',
  keycloak_public_url: 'https://43df-177-33-138-202.ngrok-free.app',
  keycloak_docker_internal_url: 'https://43df-177-33-138-202.ngrok-free.app',
  my_node_app_base_url: 'http://localhost:3000',
  client_id: 'my-node-app',
  client_secret: 'jLepuNGYIWYsEgblHXgq9G8W9qVnFv26'
}

app.get('/', (req, res) => {
  res.send('My node app for keycloak demo')
})

app.get("/admin", (req, res) => {
  res.json(req.session.user);
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect("/admin");
  }

  res.sendFile(__dirname + '/login.html')
})

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const url = `${config.keycloak_docker_internal_url}/realms/${config.realm}/protocol/openid-connect/token`

  fetch(url, {
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'password',
      scope: 'openid',
      username: username,
      password: password
    }).toString()
  })
  .then(r => r.json())
  .then(r => {
    req.session.user = r;
    req.session.save();
    res.redirect("/admin");
  })
})

app.get('/logout', (req, res) => {
  if(!req.session.user) {
    return res.redirect("/login");
  }
  fetch(
    `${config.keycloak_docker_internal_url}/realms/${config.realm}/protocol/openid-connect/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        token: req.session.user['refresh_token']
      }).toString()
    }
  )
  .then(r => {
    console.log('revoke response', r)
    console.log('destroying session ...')
    req.session.destroy((err) => {
      console.error(err);
    });
    console.log('redirect to login again ...')
    res.redirect("/login");
  })
})

app.listen(3009, () => {
  console.log('App my-node-app started')
})
