import { PropsWithChildren, createContext, useCallback, useState } from "react";
import * as utils from "./utils";
import { JWTPayload } from "jose";

type AuthContextProps = {
  auth: JWTPayload | null;
  makeLoginUrl: () => string;
  makeLogoutUrl: () => string;
  login: (accessToken: string, idToken?: string, state?: string, code?: string) => JWTPayload;
};

const initContextData: AuthContextProps = {
  auth: null, // indica se esta logado ou nao
  makeLoginUrl: utils.makeLoginUrl,
  //@ts-expect-error - this is a mock function
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  makeLogoutUrl: () => {},
  //@ts-expect-error - this is a mock function
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  login: () => {},
};

//create a context for the login state
export const AuthContext = createContext(initContextData);

//create a provider for the login state
export const AuthProvider = (props: PropsWithChildren) => {
  const makeLogin = useCallback(
    (accessToken: string, idToken?: string, state?: string, code?: string) => {
      const authData = utils.login(accessToken, idToken, state, null as any);
      //set initial tokens returned by callback
      console.log('set initial tokens')
      setData((oldData) => ({
        auth: authData,
        makeLoginUrl: oldData.makeLoginUrl,
        makeLogoutUrl: oldData.makeLogoutUrl,
        login: oldData.login,
      }));

      // after exchange the authorization code in new tokens, set the data again.
      if(code) {
        console.log('exchanging the code for token ...')
        utils.exchangeCodeForToken(code).then(authData => {
          console.log('sleeping to simulate slow network ...')
          setTimeout(() => {
            console.log('set data again after exchange code for token')
            setData((oldData) => ({
              auth: authData,
              makeLoginUrl: oldData.makeLoginUrl,
              makeLogoutUrl: oldData.makeLogoutUrl,
              login: oldData.login,
            }));
          }, 30000);
        });
      }

      return authData;
    },
    []
  );

  const [data, setData] = useState({
    auth: utils.getAuth(),
    makeLoginUrl: utils.makeLoginUrl,
    makeLogoutUrl: utils.makeLogoutUrl,
    login: makeLogin,
  });

  return (
    <AuthContext.Provider value={data}>{props.children}</AuthContext.Provider>
  );
};
