import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/canvas" element={<Workspace />} />
      </Routes>
    </Router>
  );
}

export default App;
