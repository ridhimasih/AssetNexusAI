import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useUser } from './state/auth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import AIAnalysis from './pages/AIAnalysis'
import TrustCenter from './pages/TrustCenter'
import HumanFeedback from './pages/HumanFeedback'
import FeedbackHistory from './pages/FeedbackHistory'
import KnowledgeBase from './pages/KnowledgeBase'
import NotFound from './pages/NotFound'

function RequireAuth({ children }) {
  const user = useUser()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="assets/:id/ai-analysis" element={<AIAnalysis />} />
          <Route path="analysis" element={<AIAnalysis />} />
          <Route path="trust" element={<TrustCenter />} />
          <Route path="feedback" element={<HumanFeedback />} />
          <Route path="history" element={<FeedbackHistory />} />
          <Route path="knowledge" element={<KnowledgeBase />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
