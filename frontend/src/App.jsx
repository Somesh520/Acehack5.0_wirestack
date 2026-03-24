import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import ProjectView from './components/ProjectView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/canvas" element={<Workspace />} />
        <Route path="/editor/:jobId" element={<ProjectView />} />
      </Routes>
    </Router>
  );
}

export default App;
