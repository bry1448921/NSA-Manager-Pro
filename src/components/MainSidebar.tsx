"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon, UsersIcon, FileTextIcon, LayoutDashboardIcon, UserIcon, LogOutIcon, BanknoteIcon, DollarSignIcon, ReceiptTextIcon, StampIcon, CreditCardIcon, BarChart3Icon, UserPlusIcon, ShieldCheckIcon } from 'lucide-react'; // Added ShieldCheckIcon for Admin Dashboard
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, onClick }) => (
  <Button variant="ghost" className="w-full justify-start text-lg h-12" asChild onClick={onClick}>
    <Link to={to} className="flex items-center space-x-3">
      {icon}
      <span>{label}</span>
    </Link>
  </Button>
);

const MainSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { user, profile, isLoading: isSessionLoading } = useSession(); // Get profile from session
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    setIsSheetOpen(false);
  };

  const closeSheet = () => setIsSheetOpen(false);

  if (!user && !isSessionLoading) {
    return null;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Notary Manager</h2>
      <nav className="flex flex-col space-y-2 flex-grow">
        <NavLink to="/dashboard" icon={<LayoutDashboardIcon className="h-5 w-5" />} label="Dashboard" onClick={closeSheet} />
        <NavLink to="/clients" icon={<UsersIcon className="h-5 w-5" />} label="Clients" onClick={closeSheet} />
        <NavLink to="/notarizations" icon={<FileTextIcon className="h-5 w-5" />} label="Notarizations" onClick={closeSheet} />
        <NavLink to="/orders" icon={<LayoutDashboardIcon className="h-5 w-5" />} label="Orders" onClick={closeSheet} />
        <NavLink to="/bank-accounts" icon={<BanknoteIcon className="h-5 w-5" />} label="Bank Accounts" onClick={closeSheet} />
        <NavLink to="/income" icon={<DollarSignIcon className="h-5 w-5" />} label="Income" onClick={closeSheet} />
        <NavLink to="/expenses" icon={<ReceiptTextIcon className="h-5 w-5" />} label="Expenses" onClick={closeSheet} />
        <NavLink to="/notary-credentials" icon={<StampIcon className="h-5 w-5" />} label="Notary Credentials" onClick={closeSheet} />
        <NavLink to="/reports" icon={<BarChart3Icon className="h-5 w-5" />} label="Reports" onClick={closeSheet} />
        <NavLink to="/user-management" icon={<UserPlusIcon className="h-5 w-5" />} label="User Management" onClick={closeSheet} />
        {profile?.role === 'admin' && ( // Conditionally render Admin Dashboard link
          <NavLink to="/admin-dashboard" icon={<ShieldCheckIcon className="h-5 w-5" />} label="Admin Dashboard" onClick={closeSheet} />
        )}
        <NavLink to="/pricing" icon={<CreditCardIcon className="h-5 w-5" />} label="Pricing" onClick={closeSheet} />
        <NavLink to="/manage-subscription" icon={<CreditCardIcon className="h-5 w-5" />} label="Manage Subscription" onClick={closeSheet} />
        <NavLink to="/profile" icon={<UserIcon className="h-5 w-5" />} label="Profile" onClick={closeSheet} />
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        {user && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Logged in as: <span className="font-medium">{user.email}</span>
          </div>
        )}
        <Button onClick={handleLogout} variant="destructive" className="w-full">
          <LogOutIcon className="mr-2 h-5 w-5" /> Logout
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <MenuIcon className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0">
      {sidebarContent}
    </aside>
  );
};

export default MainSidebar;