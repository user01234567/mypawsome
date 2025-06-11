import './index.css';
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import DashboardPage from "./components/DashboardPage";
import TierlistPage from "./components/TierlistPage";
// ...import any other pages!

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<DashboardPage />} />
          <Route path="tierlists/:id" element={<TierlistPage />} />
          {/* ...more pages here... */}
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
