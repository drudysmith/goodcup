'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface TermsOfServiceModalProps {
	open: boolean;
	onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ open, onClose }) => {
	return (
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
					{/* Backdrop */}
					<motion.div
						className="absolute inset-0 bg-neutral-foreground bg-opacity-40"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
					/>
					{/* Bottom-centered Sheet */}
					<motion.div
						className="fixed inset-x-0 bottom-0 mx-auto w-[92vw] sm:w-[85vw] md:w-[75vw] lg:w-[60vw] xl:w-[50vw] max-w-2xl bg-surface text-text-primary rounded-t-2xl shadow-xl p-5 md:p-6 pb-[env(safe-area-inset-bottom)]"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 260, damping: 28 }}
					>
						<div className="relative">
						<button
								aria-label="Close terms of service"
								onClick={onClose}
							className="absolute right-0 -top-2 bg-neutral-muted-bg text-text-tertiary hover:text-text-primary rounded-full w-8 h-8 flex items-center justify-center shadow"
							>
								<span className="sr-only">Close</span>
								<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
							<h2 className="text-2xl font-semibold mb-3">Terms of Service</h2>
							<div className="text-lg text-text-secondary space-y-4 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
								<p>Welcome to Goodcup — we make the best drinks, in powder and liquid form, for your health, body, and mind. By using our site or products, you agree to these terms. If you have any health conditions or concerns, it's your responsibility to review our ingredient list and check for any contraindications or substances you shouldn't consume. Our products are intended for personal, lawful use only.</p>
								<p>Payments are processed securely through the Stripe portal. Refunds are available within 30 days of purchase; requests can be sent to <a href="mailto:refunds@goodcup.me" className="underline hover:no-underline">refunds@goodcup.me</a>. Subscriptions can be renewed or managed by creating an account and accessing your dashboard, where you can also view past orders. We do our best to provide accurate information and quality products, but we are not liable for indirect, incidental, or special damages resulting from the use of our products or services.</p>
								<p>These terms may change at any time. The version you are reading is current as of August 2025. For any questions, email us at <a href="mailto:hello@goodcup.me" className="underline hover:no-underline">hello@goodcup.me</a>.</p>
								<div className="pt-4 mt-4 border-t border-neutral-border">
									<Link href="/policy" className="underline hover:no-underline text-text-primary">
										View full policy page
									</Link>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default TermsOfServiceModal;


