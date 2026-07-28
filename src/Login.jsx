import { useEffect } from 'react';
import { auth } from './firebase'; 
import { EmailAuthProvider } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';

export default function Login() {
  useEffect(() => {
    const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
    
    ui.start('#firebaseui-auth-container', {
      signInOptions: [
        EmailAuthProvider.PROVIDER_ID 
      ],
      signInSuccessUrl: '/', 
    });
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Sign in to DynastyHQ</h2>
      <div id="firebaseui-auth-container"></div> 
    </div>
  );
}