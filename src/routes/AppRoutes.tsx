import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingSpinner } from '@/components/ui';

// Route-level code splitting keeps the first load small on mobile networks.
const HomePage = lazy(() => import('@/pages/HomePage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const DestinationsPage = lazy(() => import('@/pages/DestinationsPage'));
const LocationDetailsPage = lazy(() => import('@/pages/LocationDetailsPage'));
const ExperiencesPage = lazy(() => import('@/pages/ExperiencesPage'));
const ExperienceDetailsPage = lazy(() => import('@/pages/ExperienceDetailsPage'));
const BusinessesPage = lazy(() => import('@/pages/BusinessesPage'));
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
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const TouristDashboardPage = lazy(() => import('@/pages/dashboard/TouristDashboardPage'));
const MyItinerariesPage = lazy(() => import('@/pages/dashboard/MyItinerariesPage'));
const DashboardFavoritesPage = lazy(() => import('@/pages/dashboard/DashboardFavoritesPage'));
const BookingsPage = lazy(() => import('@/pages/dashboard/BookingsPage'));
const BookingDetailsPage = lazy(() => import('@/pages/dashboard/BookingDetailsPage'));
const MyReviewsPage = lazy(() => import('@/pages/dashboard/MyReviewsPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));

const BusinessDashboardPage = lazy(() => import('@/pages/business/BusinessDashboardPage'));
const MyBusinessPage = lazy(() => import('@/pages/business/MyBusinessPage'));
const MyServicesPage = lazy(() => import('@/pages/business/MyServicesPage'));
const BusinessBookingsPage = lazy(() => import('@/pages/business/BusinessBookingsPage'));
const BusinessReviewsPage = lazy(() => import('@/pages/business/BusinessReviewsPage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminUserDetailsPage = lazy(() => import('@/pages/admin/AdminUserDetailsPage'));
const AdminLocationsPage = lazy(() => import('@/pages/admin/AdminLocationsPage'));
const AdminBusinessesPage = lazy(() => import('@/pages/admin/AdminBusinessesPage'));
const AdminBookingsPage = lazy(() => import('@/pages/admin/AdminBookingsPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-[60vh]" />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="destinations" element={<DestinationsPage />} />
          <Route path="destinations/:id" element={<LocationDetailsPage />} />
          <Route path="experiences" element={<ExperiencesPage />} />
          <Route path="experiences/:id" element={<ExperienceDetailsPage />} />
          <Route path="businesses" element={<BusinessesPage />} />
          <Route path="businesses/:id" element={<BusinessDetailsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="itinerary" element={<ItineraryBuilderPage />} />
          <Route path="eco-tourism" element={<EcoTourismPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          {['about', 'contact', 'help', 'privacy', 'terms'].map((p) => <Route key={p} path={p} element={<InfoPage />} />)}

          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
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
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="favorites" element={<DashboardFavoritesPage />} />
            <Route path="reviews" element={<MyReviewsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['business_owner']} />}>
          <Route path="business-dashboard" element={<DashboardLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route path="business" element={<MyBusinessPage />} />
            <Route path="services" element={<MyServicesPage />} />
            <Route path="bookings" element={<BusinessBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="reviews" element={<BusinessReviewsPage />} />
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
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
