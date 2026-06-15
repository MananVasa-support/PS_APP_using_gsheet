import AppRoutes from './routes/AppRoutes.jsx';
import GsErrorToaster from './components/GsErrorToaster.jsx';

/**
 * Root component. Routing lives in <AppRoutes /> so this stays tiny.
 * <GsErrorToaster /> surfaces Google Sheets save/auth failures as toasts.
 */
export default function App() {
  return (
    <>
      <GsErrorToaster />
      <AppRoutes />
    </>
  );
}
