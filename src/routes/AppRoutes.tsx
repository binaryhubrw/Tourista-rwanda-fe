import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Loading } from '@/components/ui';
import ExplorePage from '@/pages/ExplorePage';

// Route-level code splitting keeps the first load small on mobile networks.
const ExperienceDetailsPage = lazy(() => import('@/pages/ExperienceDetailsPage'));
const BusinessDetailsPage = lazy(() => import('@/pages/BusinessDetailsPage'));
const MapPage = lazy(() => import('@/pages/MapPage'));
const ItineraryBuilderPage = lazy(() => import('@/pages/ItineraryBuilderPage'));
const EcoTourismPage = lazy(() => import('@/pages/EcoTourismPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const BusinessRegisterPage = lazy(() => import('@/pages/auth/BusinessRegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const TouristDashboardPage = lazy(() => import('@/pages/dashboard/TouristDashboardPage'));
const MyItinerariesPage = lazy(() => import('@/pages/dashboard/MyItinerariesPage'));
const ItineraryDetailsPage = lazy(() => import('@/pages/dashboard/ItineraryDetailsPage'));
const DashboardFavoritesPage = lazy(() => import('@/pages/dashboard/DashboardFavoritesPage'));
const BookingsPage = lazy(() => import('@/pages/dashboard/BookingsPage'));
const BookingDetailsPage = lazy(() => import('@/pages/dashboard/BookingDetailsPage'));
const MyReviewsPage = lazy(() => import('@/pages/dashboard/MyReviewsPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage'));

const BusinessDashboardPage = lazy(() => import('@/pages/business/BusinessDashboardPage'));
const BusinessAnalyticsPage = lazy(() => import('@/pages/business/BusinessAnalyticsPage'));
const MyBusinessPage = lazy(() => import('@/pages/business/MyBusinessPage'));
const ListingEditorPage = lazy(() => import('@/pages/business/ListingEditorPage'));
const OwnerListingDetailsPage = lazy(() => import('@/pages/business/OwnerListingDetailsPage'));
const MyServicesPage = lazy(() => import('@/pages/business/MyServicesPage'));
const VehiclesPage = lazy(() => import('@/pages/business/VehiclesPage'));
const VehicleFormPage = lazy(() => import('@/pages/business/VehicleFormPage'));
const VehicleDetailsPage = lazy(() => import('@/pages/business/VehicleDetailsPage'));
const BusinessBookingsPage = lazy(() => import('@/pages/business/BusinessBookingsPage'));
const BusinessReviewsPage = lazy(() => import('@/pages/business/BusinessReviewsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminUserDetailsPage = lazy(() => import('@/pages/admin/AdminUserDetailsPage'));
const AdminLocationsPage = lazy(() => import('@/pages/admin/AdminLocationsPage'));
const AdminBusinessesPage = lazy(() => import('@/pages/admin/AdminBusinessesPage'));
const AdminBusinessDetailsPage = lazy(() => import('@/pages/admin/AdminBusinessDetailsPage'));
const AdminBookingsPage = lazy(() => import('@/pages/admin/AdminBookingsPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminFeesPage = lazy(() => import('@/pages/admin/AdminFeesPage'));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage'));
const PaymentDetailsPage = lazy(() => import('@/pages/payments/PaymentDetailsPage'));
const RefundsPage = lazy(() => import('@/pages/payments/RefundsPage'));
const RefundRequestPage = lazy(() => import('@/pages/payments/RefundRequestPage'));
const RefundDetailsPage = lazy(() => import('@/pages/payments/RefundDetailsPage'));
const StaffPage = lazy(() => import('@/pages/business/StaffPage'));

function RedirectToListings() {
  const { id } = useParams();
  return <Navigate to={id ? `/explore?location=${encodeURIComponent(id)}#explore-listings` : '/explore'} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/explore" replace />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="destinations" element={<Navigate to="/explore" replace />} />
          <Route path="destinations/:id" element={<RedirectToListings />} />
          <Route path="experiences" element={<Navigate to="/explore" replace />} />
          <Route path="experiences/:id" element={<ExperienceDetailsPage />} />
          <Route path="businesses" element={<Navigate to="/explore" replace />} />
          <Route path="businesses/:id" element={<BusinessDetailsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="itinerary" element={<ItineraryBuilderPage />} />
          <Route path="eco-tourism" element={<EcoTourismPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          {['about', 'contact', 'help', 'privacy', 'terms'].map((p) => <Route key={p} path={p} element={<InfoPage />} />)}

          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/business" element={<BusinessRegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />

          {/* Any signed-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="itinerary/:id" element={<ItineraryBuilderPage />} />
            <Route path="book/:type/:id" element={<BookingPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dashboards: their own shell (sidebar + header), outside the public navbar/footer. */}
        <Route element={<ProtectedRoute roles={['tourist']} />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<TouristDashboardPage />} />
            <Route path="itineraries" element={<MyItinerariesPage />} />
            <Route path="itineraries/:id" element={<ItineraryDetailsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="refunds/new" element={<RefundRequestPage />} />
            <Route path="refunds/:id" element={<RefundDetailsPage />} />
            <Route path="favorites" element={<DashboardFavoritesPage />} />
            <Route path="reviews" element={<MyReviewsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['business_owner', 'staff']} />}>
          <Route path="business-dashboard" element={<DashboardLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route path="analytics" element={<BusinessAnalyticsPage />} />
            <Route path="business" element={<MyBusinessPage />} />
            <Route path="business/new" element={<ListingEditorPage />} />
            <Route path="business/:id" element={<OwnerListingDetailsPage />} />
            <Route path="business/:id/edit" element={<ListingEditorPage />} />
            <Route path="services" element={<MyServicesPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="vehicles/new" element={<VehicleFormPage />} />
            <Route path="vehicles/:businessId/:serviceId/edit" element={<VehicleFormPage />} />
            <Route path="vehicles/:businessId/:serviceId" element={<VehicleDetailsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="bookings" element={<BusinessBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="refunds/:id" element={<RefundDetailsPage />} />
            <Route path="reviews" element={<BusinessReviewsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailsPage />} />
            <Route path="locations" element={<AdminLocationsPage />} />
            <Route path="businesses" element={<AdminBusinessesPage />} />
            <Route path="businesses/:id/branch" element={<OwnerListingDetailsPage variant="admin" />} />
            <Route path="businesses/:id" element={<AdminBusinessDetailsPage />} />
            <Route path="vehicles" element={<VehiclesPage variant="admin" />} />
            <Route path="vehicles/:businessId/:serviceId" element={<VehicleDetailsPage variant="admin" />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="refunds/:id" element={<RefundDetailsPage />} />
            <Route path="wallet" element={<AdminFeesPage />} />
            <Route path="fees" element={<Navigate to="/admin/wallet" replace />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
