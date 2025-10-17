"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';

interface CategoryFilterProps {
  selectedCategory: string | undefined;
  onSelectCategory: (category: string | undefined) => void;
  type: 'income' | 'expense';
}

const incomeCategories = [
  { value: 'notary_fee', label: 'Notary Fee' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'other', label: 'Other' },
];

const expenseCategories = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'education', label: 'Education' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelectCategory, type }) => {
  const categories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor={`${type}-category-filter`}>Filter by {type === 'income' ? 'Income' : 'Expense'} Category</Label>
      <Select
        value={selectedCategory || ''}
        onValueChange={(value) => onSelectCategory(value === '' ? undefined : value)}
      >
        <SelectTrigger id={`${type}-category-filter`} className="w-[200px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategoryFilter;