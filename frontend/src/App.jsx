import Login from "./pages/login";
import Dashboard from "./pages/dashboard";

function App() {
    const ruta = window.location.pathname;
    const sesion = localStorage.getItem("sesion");
    const token = localStorage.getItem("token");

    if (ruta === "/dashboard" && sesion === "true" && token) {
        return <Dashboard />;
    }

    return <Login />;
}

export default App;
