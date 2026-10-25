import React from 'react';
import { siPaypal } from 'simple-icons';

/** Brand marks Lucide does not ship (Simple Icons, CC0). Same sizing contract as a Lucide icon. */
export const PaypalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d={siPaypal.path} />
  </svg>
);

export const PAYPAL_BLUE = `#${siPaypal.hex}`;
