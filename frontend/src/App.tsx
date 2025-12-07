import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CreateCustomer from './pages/CreateCustomer';
import CreateRepresentative from './pages/CreateRepresentative';
import FormView from './pages/FormView';
import SubmissionView from './pages/SubmissionView';
import SubmissionList from './pages/SubmissionList';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="container">
        <div className="card">
          <h2>Pääsy kielletty</h2>
          <p>Sinulla ei ole oikeuksia tähän sivuun.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {user && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute>
              <CreateCustomer />
            </ProtectedRoute>
          }
        />
        <Route path="/form/:token" element={<FormView />} />
        <Route
          path="/submissions"
          element={
            <ProtectedRoute>
              <SubmissionList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions/:id"
          element={
            <ProtectedRoute>
              <SubmissionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/representatives/new"
          element={
            <AdminRoute>
              <CreateRepresentative />
            </AdminRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

