"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, LineChartIcon, UsersIcon, BriefcaseIcon, FileTextIcon, MonitorIcon } from "lucide-react";
import { Link } from "react-router-dom";

const AdminHubPage: React.FC = () => {
  const items = [
    {
      title: "Admin Overview",
      description: "System status, activity, and quick insights.",
      icon: <MonitorIcon className="h-6 w-6" />,
      to: "/admin-overview",
    },
    {
      title: "Admin User Management",
      description: "Manage application users and roles.",
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      to: "/admin-dashboard",
    },
    {
      title: "Admin Sales Reports",
      description: "Billing, revenue, and subscription analytics.",
      icon: <LineChartIcon className="h-6 w-6" />,
      to: "/admin-sales-reports",
    },
    {
      title: "Employee Management",
      description: "Manage employees, details, and performance reviews.",
      icon: <BriefcaseIcon className="h-6 w-6" />,
      to: "/admin/employees",
    },
    {
      title: "Vendor Management",
      description: "Manage vendors, EIN, and W-9 documents.",
      icon: <FileTextIcon className="h-6 w-6" />,
      to: "/admin/vendors",
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Choose a section to manage.</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-3">
              {item.icon}
              <div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={item.to}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminHubPage;