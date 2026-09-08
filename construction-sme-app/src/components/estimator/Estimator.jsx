import { Routes, Route } from 'react-router-dom'
import EstimatorHome from './EstimatorHome'
import EstimatorWizard from './EstimatorWizard'
import NeufWizard from './NeufWizard'

export default function Estimator() {
  return (
    <Routes>
      <Route index element={<EstimatorHome />} />
      <Route path="nouveau" element={<EstimatorWizard />} />
      <Route path="neuf" element={<NeufWizard />} />
    </Routes>
  )
}
