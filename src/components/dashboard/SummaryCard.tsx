"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: "default" | "good" | "bad";
  description?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, accent = "default", description }) => {
  const accentColor =
    accent === "good" ? "text-green-600" : accent === "bad" ? "text-red-600" : "text-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accentColor}`}>{typeof value === "number" ? value : value}</div>
        {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;