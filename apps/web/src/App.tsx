import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SimulatorApp from './SimulatorApp';

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<SimulatorApp />} />
            <Route path="/pipeline-test" element={<SimulatorApp />} />
        </Routes>
    );
}

export default App;
