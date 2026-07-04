import { Routes, Route } from 'react-router-dom'
import EstimatorHome from './EstimatorHome'
import EstimatorWizard from './EstimatorWizard'

export default function Estimator() {
  return (
    <Routes>
      <Route index element={<EstimatorHome />} />
      <Route path="nouveau" element={<EstimatorWizard />} />
    </Routes>
  )
}
