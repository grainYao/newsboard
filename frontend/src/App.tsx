import { ToastProvider } from './hooks/useToast'
import AppLayout from './components/AppLayout'

export default function App() {
  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  )
}
