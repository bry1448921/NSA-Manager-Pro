"use client";

import React from "react";

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, right, className }) => {
  return (
    <div className={`w-full bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-md ${className || ""}`}>
      <h2 className="text-lg font-semibold truncate">{title}</h2>
      {right ? <div className="ml-4">{right}</div> : null}
    </div>
  );
};

export default SectionHeader;