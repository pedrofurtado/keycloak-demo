# keycloak-demo

A Keycloak demo. Just for fun.

Referencia: https://github.com/devfullcycle/fc-keycloak

## Authorization code flow

- Fluxo bem parecido com o q ocorre qdo fazemos login em sites usando Gmail/Facebook/Twitter
- App server-based (com front e backend tudo junto na msm app) fazendo login no auth provider
- Backend gera uma sessao guardando o jwt com as roles e demais infos do usuario
- Usa esse jwt para autenticar ele nas requests
- nao serve pra SPA

## Implicit flow

- Serve pra qdo a app é apenas SPA, nao tem servidor backend
- O keycloack envia no callback os dados via parametro hash na URL "#" ("#" é um search param na URL). Isso faz com que nao apareça em logs e debugs no browsers, para algum atacante usar
- nao tem refresh token

https://wjw465150.gitbooks.io/keycloak-documentation/content/server_admin/topics/sso-protocols/oidc.html
