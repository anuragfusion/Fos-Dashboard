import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { BriefScreen } from './screens/brief/BriefScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { SourcesScreen } from './screens/SourcesScreen';
import { InboxScreen } from './screens/InboxScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/brief" replace /> },
      { path: 'brief', element: <BriefScreen /> },
      { path: 'clients', element: <ClientsScreen /> },
      { path: 'ledger', element: <LedgerScreen /> },
      { path: 'sources', element: <SourcesScreen /> },
      { path: 'inbox', element: <InboxScreen /> },
      { path: '*', element: <Navigate to="/brief" replace /> },
    ],
  },
]);
