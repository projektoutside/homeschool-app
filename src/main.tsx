import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { PointsProvider } from './context/PointsContext'
import { StaminaProvider } from './context/StaminaContext'
import { SoundSettingsProvider } from './context/SoundSettingsContext'
import { initializeGameAssetGate } from './features/gameAssets/gameAssetDelivery'

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <PointsProvider>
            <StaminaProvider>
              <SoundSettingsProvider>
                <App />
              </SoundSettingsProvider>
            </StaminaProvider>
          </PointsProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

const bootstrapApp = async () => {
  await initializeGameAssetGate()
  renderApp()
}

void bootstrapApp()
