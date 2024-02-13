import Cookies from "js-cookie";
import { decodeJwt } from "jose";

export function makeLoginUrl() {
  const nonce = Math.random().toString(36);
  const state = Math.random().toString(36);

  //lembrar armazenar com cookie seguro (https)
  Cookies.set("nonce", nonce);
  Cookies.set("state", state);

  const loginUrlParams = new URLSearchParams({
    client_id: "my-react-app",
    redirect_uri: "http://localhost:3018/callback",
    response_type: "token id_token", // "token" obtem o acess_token. "id_token" obtem o token do openid (o token do openid é usado para fazer o logout no keycloak)
    nonce: nonce,
    state: state,
  });

  return `https://4f43-177-33-138-202.ngrok-free.app/realms/my-company/protocol/openid-connect/auth?${loginUrlParams.toString()}`;
}

export function login(accessToken: string, idToken: string, state: string) {
  const stateCookie = Cookies.get("state");
  if (stateCookie !== state) {
    throw new Error("Invalid state");
  }

  let decodedAccessToken = null;
  let decodedIdToken = null;
  try {
    decodedAccessToken = decodeJwt(accessToken);
    decodedIdToken = decodeJwt(idToken);
  } catch (e) {
    throw new Error("Invalid token");
  }

  if (decodedAccessToken.nonce !== Cookies.get("nonce")) {
    throw new Error("Invalid nonce");
  }

  if (decodedIdToken.nonce !== Cookies.get("nonce")) {
    throw new Error("Invalid nonce");
  }

  Cookies.set("access_token", accessToken);
  Cookies.set("id_token", idToken);

  return decodedAccessToken;
}

export function getAuth() {
  const token = Cookies.get("access_token");

  if (!token) {
    return null;
  }

  try {
    return decodeJwt(token);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function makeLogoutUrl() {
  if (!Cookies.get("id_token")) {
    return false;
  }
  const logoutParams = new URLSearchParams({
    client_id: "my-react-app",
    id_token_hint: Cookies.get("id_token") as string,
    post_logout_redirect_uri: "http://localhost:3018/",
  });

  Cookies.remove("access_token");
  Cookies.remove("id_token");
  Cookies.remove("nonce");
  Cookies.remove("state");
  Cookies.remove('keycloack_callback_params');

  return `https://4f43-177-33-138-202.ngrok-free.app/realms/my-company/protocol/openid-connect/logout?${logoutParams.toString()}`;
}
