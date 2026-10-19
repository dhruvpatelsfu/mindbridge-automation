import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { CartProvider } from './contexts/CartContext'
import { DefectsProvider } from './contexts/DefectsContext'
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import CourseDetail from './pages/CourseDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Confirmation from './pages/Confirmation'
import Login from './pages/Login'
import Register, {
  RegisterIndexRedirect,
  RegisterStep1,
  RegisterStep2,
  RegisterStep3
} from './pages/Register'
import MyLearning from './pages/MyLearning'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Enroll from './pages/Enroll'
import AdminCourses from './pages/admin/AdminCourses'
import AdminCourseEdit from './pages/admin/AdminCourseEdit'
import AdminUsers from './pages/admin/AdminUsers'
import NotFound from './pages/NotFound'

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <DefectsProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Catalogue />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />}>
                <Route index element={<RegisterIndexRedirect />} />
                <Route path="step/1" element={<RegisterStep1 />} />
                <Route path="step/2" element={<RegisterStep2 />} />
                <Route path="step/3" element={<RegisterStep3 />} />
              </Route>
              <Route
                path="/checkout"
                element={
                  <RequireAuth>
                    <Checkout />
                  </RequireAuth>
                }
              />
              <Route
                path="/checkout/success"
                element={
                  <RequireAuth>
                    <Confirmation />
                  </RequireAuth>
                }
              />
              <Route
                path="/my/learning"
                element={
                  <RequireAuth>
                    <MyLearning />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/account"
                element={
                  <RequireAuth>
                    <Account />
                  </RequireAuth>
                }
              />
              <Route
                path="/practice"
                element={
                  <RequireAuth>
                    <Practice />
                  </RequireAuth>
                }
              />
              <Route
                path="/enroll/:courseId"
                element={
                  <RequireAuth>
                    <Enroll />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <RequireRole role="admin">
                    <AdminCourses />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/courses/:id"
                element={
                  <RequireRole role="admin">
                    <AdminCourseEdit />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireRole role="admin">
                    <AdminUsers />
                  </RequireRole>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </CartProvider>
      </DefectsProvider>
    </BrowserRouter>
  )
}
