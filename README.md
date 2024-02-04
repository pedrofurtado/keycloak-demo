# keycloak-demo
A Keycloak demo. Just for fun.

## Authorization code flow

- Fluxo bem parecido com o q ocorre qdo fazemos login em sites usando Gmail/Facebook/Twitter
- App frontend realizando login numa app backend
- Backend gera uma sessao guardando o jwt com as roles e demais infos do usuario
- Usa esse jwt para autenticar ele nas requests

## Implicit flow
