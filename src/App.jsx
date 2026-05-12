import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Summarizer from "./pages/Summarizer";
import Editor from "./pages/Editor";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import NoteReader from "./pages/NoteReader";
import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/summarizer"
        element={
          <ProtectedRoute>
            <Summarizer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/editor"
        element={
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notes/:id"
        element={
          <ProtectedRoute>
            <NoteReader />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shared"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tags"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notification-settings"
        element={
          <ProtectedRoute>
            <NotificationSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;