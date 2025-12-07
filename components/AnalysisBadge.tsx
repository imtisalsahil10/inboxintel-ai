import React from 'react';
import { Priority, Category } from '../types';

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.HIGH]: 'bg-red-100 text-red-700 border-red-200',
    [Priority.MEDIUM]: 'bg-amber-100 text-amber-700 border-amber-200',
    [Priority.LOW]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[priority]}`}>
      {priority}
    </span>
  );
};

export const CategoryBadge = ({ category }: { category: Category }) => {
    const colors = {
        [Category.WORK]: 'bg-blue-100 text-blue-700',
        [Category.PERSONAL]: 'bg-purple-100 text-purple-700',
        [Category.NEWSLETTER]: 'bg-gray-100 text-gray-700',
        [Category.FINANCE]: 'bg-green-100 text-green-700',
        [Category.SPAM_LIKELY]: 'bg-red-50 text-red-600',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${colors[category]}`}>
            {category.replace('_', ' ')}
        </span>
    );
};
