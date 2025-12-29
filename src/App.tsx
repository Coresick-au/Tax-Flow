import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Deductions } from './pages/Deductions';
import { PropertyPortfolio } from './pages/PropertyPortfolio';
import { Crypto } from './pages/Crypto';
import { Receipts } from './pages/Receipts';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Income } from './pages/Income';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/deductions" element={<Deductions />} />
        <Route path="/property" element={<PropertyPortfolio />} />
        <Route path="/crypto" element={<Crypto />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}



export default App;
