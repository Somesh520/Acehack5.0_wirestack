import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Workspace from './components/Workspace';
import ProjectView from './components/ProjectView';
import LearnPage from './components/LearnPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/canvas" element={<Workspace />} />
        <Route path="/editor/:jobId" element={<ProjectView />} />
        <Route path="/learn" element={<LearnPage />} />
      </Routes>
    </Router>
  );
}

export default App;
