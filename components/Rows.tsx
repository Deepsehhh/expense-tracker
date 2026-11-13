'use client';
import { ReactNode } from 'react';

export function Row({ title, sub, amount, onEdit, onDelete }: {
  title: string; sub: string; amount?: ReactNode; onEdit?: () => void; onDelete: () => void;
}) {
  return (
    <div className="row">
      <div className="main">
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
      {amount !== undefined && <div className="amt">{amount}</div>}
      {onEdit && <button className="icon" aria-label={`Edit ${title}`} onClick={onEdit}>✏️</button>}
      <button className="icon" aria-label={`Delete ${title}`} onClick={onDelete}>🗑️</button>
    </div>
  );
}
