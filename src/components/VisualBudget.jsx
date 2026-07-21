import { useState } from 'react';
import { Mail, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatCurrency, CATEGORY_ICONS } from '../lib/utils';
import { toast } from 'sonner';

export default function VisualBudget({ budgets, categories, totalIncome, onAllocate }) {
  const totalAllocated = budgets.reduce((s, b) => s + b.amount, 0);
  const unallocated = Math.max(0, totalIncome - totalAllocated);

  const [dragAmount, setDragAmount] = useState(50000); // Default drop size
  const [dragging, setDragging] = useState(false);

  // When dragging starts, we set a data payload (not strictly needed since state tracks it, but good practice)
  const handleDragStart = (e) => {
    setDragging(true);
    e.dataTransfer.setData('amount', dragAmount.toString());
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, budget) => {
    e.preventDefault();
    setDragging(false);
    
    if (unallocated < dragAmount) {
      toast.error("Dana belum dialokasikan tidak mencukupi!");
      return;
    }

    try {
      await onAllocate(budget.id, budget.amount + dragAmount);
      toast.success(`Berhasil menambahkan ${formatCurrency(dragAmount)} ke ${budget.category?.name}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="visual-budget-container animate-fade-in" style={{ padding: '16px 0' }}>
      
      {/* Source Area: Coins / Cash stack */}
      <div className="unallocated-source" style={{ 
        background: 'var(--gradient-primary)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px', 
        color: 'white',
        textAlign: 'center',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>Dana Belum Dialokasikan</h3>
        <h2 className="amount-text" style={{ margin: '0 0 16px 0', fontSize: '28px' }}>{formatCurrency(unallocated)}</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Tarik koin di bawah ke amplop anggaran:</span>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[10000, 50000, 100000, 500000].map(amt => (
              <div 
                key={amt}
                draggable
                onDragStart={(e) => { setDragAmount(amt); handleDragStart(e); }}
                onDragEnd={handleDragEnd}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                title={`Tarik ${formatCurrency(amt)}`}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {amt / 1000}k
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-primary)' }}>Amplop Anggaran</h3>
      
      {budgets.length === 0 ? (
        <div className="empty-state">
          <Mail size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>Belum ada anggaran. Buat anggaran standar terlebih dahulu.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: '16px' 
        }}>
          {budgets.map(b => {
            const cat = categories.find(c => c.id === b.category_id);
            if (!cat) return null;
            const fullBudget = { ...b, category: cat };

            return (
              <div 
                key={b.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, fullBudget)}
                style={{
                  background: dragging ? 'var(--bg-main)' : 'var(--bg-elevated)',
                  border: `2px dashed ${dragging ? cat.color : 'transparent'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s',
                  transform: dragging ? 'scale(1.02)' : 'scale(1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Envelope Flap visual */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: cat.color,
                  opacity: 0.8
                }} />
                
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                  {CATEGORY_ICONS[cat.icon]}
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {cat.name}
                </div>
                <div className="amount-text" style={{ fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {formatCurrency(b.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
