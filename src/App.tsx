import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import IndexPage from './pages/index'
import NotFoundPage from './pages/404'

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
