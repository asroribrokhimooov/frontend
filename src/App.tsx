import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { GroupsPage } from './pages/groups/GroupsPage';
import { GroupDetailPage } from './pages/groups/GroupDetailPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { StudentDetailPage } from './pages/students/StudentDetailPage';
import { StudentProfilePage } from './pages/students/StudentProfilePage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { RemindersPage } from './pages/reminders/RemindersPage';
import { MessagesPage } from './pages/MessagesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { AttendancePage } from './pages/attendance/AttendancePage';

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">Yuklanmoqda...</div>}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <GroupsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <GroupDetailPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <StudentsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <StudentDetailPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-profile/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <StudentProfilePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PaymentsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <RemindersPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <MessagesPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ReportsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/archive"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ArchivePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AttendancePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
}

export default App;
