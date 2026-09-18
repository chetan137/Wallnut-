import React from 'react';
import { X, Package, TrendingUp, TrendingDown, IndianRupee, AlertCircle, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function DealerProductDrilldownModal({ isOpen, onClose, dealer }) {
  if (!isOpen || !dealer) return null;

  const {
    dealer: dealerName,
    salesMan,
    district,
    totalSales = 0,
    outstanding = 0,
    transactions = 0,
    productList = [],
    pyGrowth = null,
    monthlySales = {},
  } = dealer;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 6, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                {dealerName} — Product Purchase Drill-Down
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Officer: <strong style={{ color: 'var(--text-secondary)' }}>{salesMan || 'Unassigned'}</strong> • District: <strong style={{ color: 'var(--text-secondary)' }}>{district || 'N/A'}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Summary Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            padding: '16px 20px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Sales (Excl. GST)
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px' }}>
              {formatCurrency(totalSales)}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Outstanding Balance
            </div>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: outstanding > 100000 ? 'var(--danger)' : 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {formatCurrency(outstanding)}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Growth (vs Prior Period)
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {pyGrowth !== null ? (
                pyGrowth >= 0 ? (
                  <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                    <TrendingUp size={16} style={{ marginRight: 4 }} /> +{pyGrowth}%
                  </span>
                ) : (
                  <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                    <TrendingDown size={16} style={{ marginRight: 4 }} /> {pyGrowth}%
                  </span>
                )
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>N/A (1st Period)</span>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Orders / Invoices
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {formatNumber(transactions)} Bills
            </div>
          </div>
        </div>

        {/* Product Breakdown Table */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={16} style={{ color: 'var(--accent-primary)' }} />
              Products Purchased ({productList.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Values without GST (Base taxable value)
            </span>
          </div>

          {productList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              No item-level line items found for this dealer.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Product Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Qty</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Rate (Excl. GST)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Net Value</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Share (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {productList.map((prod, idx) => (
                    <tr
                      key={prod.name || idx}
                      style={{
                        borderBottom: idx === productList.length - 1 ? 'none' : '1px solid var(--card-border)',
                        background: idx % 2 === 1 ? 'rgba(0,0,0,0.01)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {prod.name}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatNumber(prod.quantity)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prod.units}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(prod.avgRate)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(prod.amount)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <div
                            style={{
                              width: '45px',
                              height: '6px',
                              background: 'var(--card-border)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(prod.sharePct, 100)}%`,
                                height: '100%',
                                background: 'var(--accent-primary)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '28px' }}>
                            {prod.sharePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly purchase summary pills */}
          {Object.keys(monthlySales).length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Monthly Purchases Breakdown (Excl. GST):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(monthlySales).sort(([a], [b]) => a.localeCompare(b)).map(([month, amt]) => (
                  <div
                    key={month}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{month}:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(amt)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--card-border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px' }}
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
}
