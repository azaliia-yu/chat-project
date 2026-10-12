import { IonApp, setupIonicReact } from '@ionic/react';
import Chat from './pages/Chat';

/* Ionic Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <Chat />
    </IonApp>
  );
}