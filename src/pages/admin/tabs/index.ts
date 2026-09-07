// Admin Tabs - Lazy loaded for code splitting
import React from 'react';

export const DashboardTab = React.lazy(() => import('./DashboardTab').then((m) => ({ default: m.DashboardTab })));
export const OrdersTab = React.lazy(() => import('./OrdersTab').then((m) => ({ default: m.OrdersTab })));
export const PrescriptionsTab = React.lazy(() => import('./PrescriptionsTab').then((m) => ({ default: m.PrescriptionsTab })));
export const PharmaciesTab = React.lazy(() => import('./PharmaciesTab').then((m) => ({ default: m.PharmaciesTab })));
export const ProductsTab = React.lazy(() => import('./ProductsTab').then((m) => ({ default: m.ProductsTab })));
export const CategoriesTab = React.lazy(() => import('./CategoriesTab').then((m) => ({ default: m.CategoriesTab })));
export const DiscountsTab = React.lazy(() => import('./DiscountsTab').then((m) => ({ default: m.DiscountsTab })));
export const CouponsTab = React.lazy(() => import('./CouponsTab').then((m) => ({ default: m.CouponsTab })));
export const ReviewsTab = React.lazy(() => import('./ReviewsTab').then((m) => ({ default: m.ReviewsTab })));
export const CustomersTab = React.lazy(() => import('./CustomersTab').then((m) => ({ default: m.CustomersTab })));
export const SubscribersTab = React.lazy(() => import('./SubscribersTab').then((m) => ({ default: m.SubscribersTab })));
export const StockAlertsTab = React.lazy(() => import('./StockAlertsTab').then((m) => ({ default: m.StockAlertsTab })));
export const LoyaltyTab = React.lazy(() => import('./LoyaltyTab').then((m) => ({ default: m.LoyaltyTab })));
export const DoseRulesTab = React.lazy(() => import('./DoseRulesTab').then((m) => ({ default: m.DoseRulesTab })));
export const AnalyticsTab = React.lazy(() => import('./AnalyticsTab').then((m) => ({ default: m.AnalyticsTab })));
export const SettingsTab = React.lazy(() => import('./SettingsTab').then((m) => ({ default: m.SettingsTab })));