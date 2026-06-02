import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import MainPage from "./pages/MainPage.tsx";
import StrategyTable from "./pages/StrategyTable.tsx";
import StrategyDetail from "./pages/StrategyDetail.tsx";
import AdminIndicators from "./pages/AdminIndicators.tsx";
import IndicatorsPage from "./pages/IndicatorsPage.tsx";
import { IndicatorRegistryProvider } from "./context/IndicatorRegistry.tsx";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <IndicatorRegistryProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route
            path="/main"
            element={
              isAuthenticated ? <MainPage /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/strategies"
            element={
              isAuthenticated ? <StrategyTable /> : <Navigate to="/" replace />
            }
          />
          <Route path="/strategies/new" element={<StrategyDetail mode="new" />} />
          <Route path="/strategies/:id/edit" element={<StrategyDetail mode="edit" />} />
          <Route path="/admin/indicators" element={<AdminIndicators />} />
          <Route path="/indicators" element={<IndicatorsPage />} />
        </Routes>
      </Router>
    </IndicatorRegistryProvider>
  );
};

export default App;