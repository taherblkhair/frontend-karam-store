/**
 * Horizontal scroll wrapper for admin data tables on small screens.
 * Keeps layout from breaking on iPhone while allowing swipe to see columns.
 */
export function TableScroll({ children, className = '' }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div
        className="overflow-x-auto overscroll-x-contain touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </div>
  );
}
