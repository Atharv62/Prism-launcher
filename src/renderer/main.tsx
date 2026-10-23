import { createRoot } from 'react-dom/client'
import App from './App'
import Overlay from './Overlay'
import './index.css'

createRoot(document.getElementById('root')!).render(location.hash === '#overlay' ? <Overlay /> : <App />)
