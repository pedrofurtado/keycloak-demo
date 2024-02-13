# keycloak-demo

A Keycloak demo. Just for fun.

Referencia: https://github.com/devfullcycle/fc-keycloak

## Authorization code flow

- Fluxo bem parecido com o q ocorre qdo fazemos login em sites usando Gmail/Facebook/Twitter
- App server-based (com front e backend tudo junto na msm app) fazendo login no auth provider
- Backend gera uma sessao guardando o jwt com as roles e demais infos do usuario
- Usa esse jwt para autenticar ele nas requests
- nao serve pra SPA

## Implicit flow (authorization code flow sem "code" e sem "refresh token")

- Serve pra qdo a app é apenas SPA, nao tem servidor backend
- O keycloack envia no callback os dados via parametro hash na URL "#" ("#" é um search param na URL). Isso faz com que nao apareça em logs e debugs no browsers, para algum atacante usar
- nao tem refresh token
- Analogia: ImplicitFlow é o Authorization code flow só q sem a troca de um authorization code para um access_token, pois no callback ja vem direto o access_token. Alem disso, é um authorization code flow sem o refresh token

## Hybrid flow (junção de Implicit flow + authorization code flow)

- Analogia: Implicit flow + authorization code flow
- Ao gerar a URL de redirect pro login, adicionamos no response_type a opcao "code", para trazer o authorization code nos dados do callback.
- Cenario de uso: SPA que pega via Implicit flow os tokens iniciais, e em background (enquanto usuario navega pela app), a spa faz a request pro keycloack pra trocar os tokens para novos tokens (via authorization code recebido no callback). Assim, vc garante a performance de obtenção do primeiro token, e garante maior segurança por invalida-los rapidamente na segunda troca de tokens, ai sim via authorization code (analogo ao que é feito no Authorization code)

## "Resource Owner Password Credentials" ou "Direct grant"

- Quando a app "esconde" a autenticação do keycloak do usuario. A app obtem as infos de user+senha do usuario final (via formulario ou coisa do tipo), passa no backend para o Keycloak e obtem o access token, sem redirecionar o usuário para uma tela de login do Keycloak.
- Apesar de tornar "transparente" o login (afinal, usuario nao fica sabendo que por debaixo dos panos ele foi pro Keycloak), nao permite uso de 2FA ou single sign on, pois nao tem a renderização de telas do Keycloak no meio do processo (a tela do Keycloak no meio do processo é o que justamente faz acontecer o SSO + 2FA + Confirmação por email + Troca de senha temporaria + etc).

## Client Credentials Grant

- Usado para fazer a autenticaão entre 2 microserviços backend.
- Nesse fluxo, nao há browser nem usuário final (ser humano), e sim apenas apps backend comunicando e autenticando entre si

https://wjw465150.gitbooks.io/keycloak-documentation/content/server_admin/topics/sso-protocols/oidc.html
